import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  UserRole,
  type Notification,
  type Prisma,
} from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(user: JwtUser, dto: CreateNotificationDto) {
    if (user.role === UserRole.TRAINER) {
      const allowed = await this.canTrainerNotifyRecipient(user.id, dto.recipientId);
      if (!allowed) {
        throw new ForbiddenException('Trainer can only create notifications for active students or self');
      }
    }

    return this.createNotification({
      recipientId: dto.recipientId,
      senderId: user.id,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      actionHref: dto.actionHref,
      actionLabel: dto.actionLabel,
      meta: dto.meta as Prisma.InputJsonValue | undefined,
    });
  }

  async list(user: JwtUser, query: ListNotificationsDto) {
    const where = {
      recipientId: user.id,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const total = await this.prisma.notification.count({ where });
    const unreadCount = await this.prisma.notification.count({
      where: { recipientId: user.id, readAt: null },
    });
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.notification.findMany({
      where,
      skip,
      take,
      include: {
        sender: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(items.map((item) => this.toNotificationDto(item)), {
      ...meta,
      unreadCount,
    });
  }

  async read(user: JwtUser, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.recipientId !== user.id) {
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    await this.publishNotificationInvalidation(user.id, 'read', updated.id);
    return updated;
  }

  async readAll(user: JwtUser) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    await this.publishNotificationInvalidation(user.id, 'read-all');
    return { updated: result.count };
  }

  async createNotification(data: {
    recipientId: string;
    senderId?: string | null;
    directMessageId?: string | null;
    supportTicketId?: string | null;
    type: NotificationType;
    title: string;
    body: string;
    imageUrl?: string | null;
    actionHref?: string | null;
    actionLabel?: string | null;
    meta?: Prisma.InputJsonValue;
  }) {
    const created = await this.prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        senderId: data.senderId ?? undefined,
        directMessageId: data.directMessageId ?? undefined,
        supportTicketId: data.supportTicketId ?? undefined,
        type: data.type,
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl ?? undefined,
        actionHref: data.actionHref ?? undefined,
        actionLabel: data.actionLabel ?? undefined,
        meta: data.meta,
      },
      include: {
        sender: {
          select: { id: true, fullName: true },
        },
      },
    });
    await this.publishNotificationInvalidation(data.recipientId, 'created', created.id);
    return created;
  }

  async markDirectMessageNotificationRead(directMessageId: string, recipientId: string) {
    await this.prisma.notification.updateMany({
      where: {
        directMessageId,
        recipientId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    await this.publishNotificationInvalidation(recipientId, 'read');
  }

  private async canTrainerNotifyRecipient(trainerId: string, recipientId: string) {
    if (trainerId === recipientId) {
      return true;
    }

    const relationship = await this.prisma.trainerStudent.findFirst({
      where: {
        trainerId,
        studentId: recipientId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    return Boolean(relationship);
  }

  private toNotificationDto(
    notification: Notification & { sender?: { id: string; fullName: string } | null },
  ) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      actionHref: notification.actionHref,
      actionLabel: notification.actionLabel,
      senderId: notification.senderId,
      senderName: notification.sender?.fullName ?? null,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }

  private async publishNotificationInvalidation(
    recipientId: string,
    reason: 'created' | 'read' | 'read-all',
    notificationId?: string,
  ) {
    const unreadCount = await this.prisma.notification.count({
      where: { recipientId, readAt: null },
    });

    this.realtimeService.publishToUser(recipientId, {
      channel: 'notifications',
      event: 'notifications.invalidate',
      data: {
        reason,
        notificationId,
        unreadCount,
      },
    });
  }
}
