import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type RefreshToken, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import type { FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { JwtUser } from '../common/types/jwt-user.type';
import { userProfileInclude } from '../common/utils/prisma-selects';
import { sanitizeUser } from '../common/utils/serialization.util';
import { durationToMs } from '../common/utils/time.util';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, request: FastifyRequest) {
    const role = dto.role === UserRole.TRAINER ? UserRole.TRAINER : UserRole.STUDENT;
    const email = this.normalizeEmail(dto.email);
    const username = this.normalizeUsername(dto.username);
    const existingUser = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email }, ...(username ? [{ username }] : [])],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        bio: dto.bio,
        role,
        status: UserStatus.ACTIVE,
        passwordChangedAt: new Date(),
        lastLoginAt: new Date(),
        trainerProfile: role === UserRole.TRAINER ? { create: { specialties: [] } } : undefined,
        studentProfile: role === UserRole.STUDENT ? { create: {} } : undefined,
      },
      include: userProfileInclude,
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      this.extractSessionContext(request),
    );
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto, request: FastifyRequest) {
    const user = await this.prisma.user.findFirst({
      where: { email: this.normalizeEmail(dto.email), deletedAt: null },
      include: userProfileInclude,
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      this.extractSessionContext(request, dto.deviceId),
    );
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto, request: FastifyRequest) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!storedToken || storedToken.userId !== payload.sub || storedToken.sessionId !== payload.sid) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    if (storedToken.revokedAt) {
      await this.revokeTokenFamily(storedToken.familyId, 'reuse_detected');
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const isMatch = await argon2.verify(storedToken.tokenHash, dto.refreshToken);
    if (!isMatch) {
      await this.revokeTokenFamily(storedToken.familyId, 'invalid_hash');
      throw new UnauthorizedException('Refresh token is invalid');
    }

    if (storedToken.expiresAt <= new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date(), revokedReason: 'expired', lastUsedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: userProfileInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tokens = await this.rotateRefreshToken(
      user.id,
      user.email,
      user.role,
      storedToken,
      this.extractSessionContext(request, dto.deviceId),
    );
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  async logout(user: JwtUser, dto: RefreshTokenDto | undefined, request: FastifyRequest) {
    if (dto?.refreshToken) {
      const payload = await this.verifyRefreshToken(dto.refreshToken);
      const token = await this.prisma.refreshToken.findUnique({
        where: { id: payload.jti },
      });

      if (token && token.userId === user.id) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: {
            revokedAt: new Date(),
            revokedReason: 'logout',
            lastUsedAt: new Date(),
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });
        return { message: 'Logged out successfully' };
      }
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout_all', lastUsedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        ...userProfileInclude,
        trainerRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: { id: true, fullName: true, username: true, avatarUrl: true },
            },
          },
        },
        studentRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            trainer: {
              select: { id: true, fullName: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return sanitizeUser(user);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    context: SessionContext,
  ) {
    return this.issueTokenPair(userId, email, role, {
      ...context,
      sessionId: randomUUID(),
      familyId: randomUUID(),
    });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: UserRole,
    session: SessionContext & { sessionId: string; familyId: string },
  ) {
    const accessExpiresIn = this.configService.getOrThrow<TokenDuration>('JWT_ACCESS_TTL');
    const refreshExpiresIn = this.configService.getOrThrow<TokenDuration>('JWT_REFRESH_TTL');
    const refreshTokenId = randomUUID();
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' as const },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          ...payload,
          type: 'refresh' as const,
          jti: refreshTokenId,
          sid: session.sessionId,
          fid: session.familyId,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId,
        tokenHash: await argon2.hash(refreshToken),
        sessionId: session.sessionId,
        familyId: session.familyId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceId: session.deviceId,
        expiresAt: new Date(Date.now() + durationToMs(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; type: 'refresh' }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh' || !('jti' in payload) || !('sid' in payload) || !('fid' in payload)) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private async rotateRefreshToken(
    userId: string,
    email: string,
    role: UserRole,
    currentToken: RefreshToken,
    context: SessionContext,
  ) {
    const nextRefreshTokenId = randomUUID();
    const refreshExpiresIn = this.configService.getOrThrow<TokenDuration>('JWT_REFRESH_TTL');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role, type: 'access' as const },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.getOrThrow<TokenDuration>('JWT_ACCESS_TTL'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
          type: 'refresh' as const,
          jti: nextRefreshTokenId,
          sid: currentToken.sessionId,
          fid: currentToken.familyId,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({
        data: {
          id: nextRefreshTokenId,
          userId,
          tokenHash: await argon2.hash(refreshToken),
          sessionId: currentToken.sessionId,
          familyId: currentToken.familyId,
          expiresAt: new Date(Date.now() + durationToMs(refreshExpiresIn)),
          userAgent: context.userAgent ?? currentToken.userAgent,
          ipAddress: context.ipAddress ?? currentToken.ipAddress,
          deviceId: context.deviceId ?? currentToken.deviceId,
        },
      });

      await tx.refreshToken.update({
        where: { id: currentToken.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'rotated',
          replacedByTokenId: nextRefreshTokenId,
          lastUsedAt: new Date(),
          userAgent: context.userAgent ?? currentToken.userAgent,
          ipAddress: context.ipAddress ?? currentToken.ipAddress,
          deviceId: context.deviceId ?? currentToken.deviceId,
        },
      });
    });

    return { accessToken, refreshToken };
  }

  private async revokeTokenFamily(familyId: string | null, reason: string) {
    if (!familyId) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
        lastUsedAt: new Date(),
      },
    });
  }

  private extractSessionContext(request: FastifyRequest, deviceId?: string): SessionContext {
    return {
      deviceId,
      ipAddress: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined,
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeUsername(username?: string | null) {
    if (!username) {
      return null;
    }

    return username.trim().toLowerCase();
  }
}

type TokenDuration = `${number}${'s' | 'm' | 'h' | 'd'}`;
type RefreshTokenPayload = {
  sub: string;
  type: 'refresh';
  jti: string;
  sid: string;
  fid: string;
};

type SessionContext = {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
};
