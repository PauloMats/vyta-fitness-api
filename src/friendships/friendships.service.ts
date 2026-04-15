import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus, NotificationType, UserRole } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListFriendshipsDto } from './dto/list-friendships.dto';
import { RequestFriendshipDto } from './dto/request-friendship.dto';
import { UpdateFriendshipStatusDto } from './dto/update-friendship-status.dto';

@Injectable()
export class FriendshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async request(user: JwtUser, dto: RequestFriendshipDto) {
    if (user.id === dto.addresseeId) {
      throw new ForbiddenException('Users cannot send friendship requests to themselves');
    }

    const addressee = await this.prisma.user.findUnique({
      where: { id: dto.addresseeId },
      select: { id: true, fullName: true },
    });
    if (!addressee) {
      throw new NotFoundException('Addressee not found');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: { pairKey: this.getPairKey(user.id, dto.addresseeId) },
    });
    if (existing) {
      throw new ConflictException('Friendship already exists');
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId: user.id,
        addresseeId: dto.addresseeId,
        pairKey: this.getPairKey(user.id, dto.addresseeId),
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        addressee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    await this.prisma.notification.create({
      data: {
        recipientId: dto.addresseeId,
        senderId: user.id,
        type: NotificationType.FRIEND_REQUEST,
        title: 'Nova solicitacao de amizade',
        body: `${friendship.requester.fullName} enviou uma solicitacao de amizade.`,
        meta: { friendshipId: friendship.id },
      },
    });

    return friendship;
  }

  async updateStatus(user: JwtUser, friendshipId: string, dto: UpdateFriendshipStatusDto) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: { select: { id: true, fullName: true } },
        addressee: { select: { id: true, fullName: true } },
      },
    });
    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    if (user.role !== UserRole.ADMIN && user.id !== friendship.addresseeId) {
      throw new ForbiddenException('Only the addressee or admin can update this friendship');
    }

    if (friendship.status === FriendshipStatus.BLOCKED && user.role !== UserRole.ADMIN) {
      throw new ConflictException('Blocked friendships can only be changed by admin');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: dto.status },
      include: {
        requester: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        addressee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    return updated;
  }

  async list(user: JwtUser, query: ListFriendshipsDto) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(user.role === UserRole.ADMIN
        ? {}
        : {
            OR: [{ requesterId: user.id }, { addresseeId: user.id }],
          }),
    };
    const total = await this.prisma.friendship.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.friendship.findMany({
      where,
      skip,
      take,
      include: {
        requester: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        addressee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(items, meta);
  }

  private getPairKey(leftUserId: string, rightUserId: string) {
    return [leftUserId, rightUserId].sort().join(':');
  }
}
