import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
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

  async register(dto: RegisterDto) {
    const role = dto.role === UserRole.TRAINER ? UserRole.TRAINER : UserRole.STUDENT;
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, ...(dto.username ? [{ username: dto.username }] : [])],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        bio: dto.bio,
        role,
        status: UserStatus.ACTIVE,
        trainerProfile: role === UserRole.TRAINER ? { create: { specialties: [] } } : undefined,
        studentProfile: role === UserRole.STUDENT ? { create: {} } : undefined,
      },
      include: userProfileInclude,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: userProfileInclude,
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    const matchedToken = await this.findMatchingRefreshToken(activeTokens, dto.refreshToken);
    if (!matchedToken) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      include: userProfileInclude,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  async logout(user: JwtUser, dto?: RefreshTokenDto) {
    if (dto?.refreshToken) {
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      });
      const matchedToken = await this.findMatchingRefreshToken(activeTokens, dto.refreshToken);

      if (matchedToken) {
        await this.prisma.refreshToken.update({
          where: { id: matchedToken.id },
          data: { revokedAt: new Date() },
        });
        return { message: 'Logged out successfully' };
      }
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
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

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const accessExpiresIn = this.configService.getOrThrow<TokenDuration>('JWT_ACCESS_TTL');
    const refreshExpiresIn = this.configService.getOrThrow<TokenDuration>('JWT_REFRESH_TTL');
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
        { ...payload, type: 'refresh' as const },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await argon2.hash(refreshToken),
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

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private async findMatchingRefreshToken(tokens: Prisma.RefreshTokenUncheckedCreateInput[], rawToken: string) {
    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, rawToken)) {
        return token;
      }
    }
    return null;
  }
}

type TokenDuration = `${number}${'s' | 'm' | 'h' | 'd'}`;
