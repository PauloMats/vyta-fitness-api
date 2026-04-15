import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageCategory,
  NotificationType,
  TrainerStudentStatus,
  UserRole,
  type DirectMessage,
} from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { ListDirectMessagesDto } from './dto/list-direct-messages.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(user: JwtUser, dto: CreateDirectMessageDto) {
    const relationship = await this.resolveActiveRelationship(user, dto.recipientId);

    const created = await this.prisma.directMessage.create({
      data: {
        senderId: user.id,
        recipientId: dto.recipientId,
        trainerId: relationship.trainerId,
        studentId: relationship.studentId,
        subject: dto.subject,
        category: dto.category ?? MessageCategory.GENERAL,
        body: dto.body,
      },
    });

    await this.notificationsService.createNotification({
      recipientId: dto.recipientId,
      senderId: user.id,
      directMessageId: created.id,
      type: NotificationType.MESSAGE,
      title: dto.subject ?? 'Nova mensagem',
      body: dto.body.slice(0, 180),
      actionHref:
        user.role === UserRole.STUDENT
          ? `/students?studentId=${relationship.studentId}&compose=1`
          : '/support',
      actionLabel: 'Abrir mensagem',
      meta: {
        directMessageId: created.id,
        trainerId: relationship.trainerId,
        studentId: relationship.studentId,
      },
    });

    await this.publishMessageInvalidation(created.recipientId, 'inbox', 'created', created.id);
    await this.publishMessageInvalidation(created.senderId, 'sent', 'created', created.id);

    return this.findOne(user, created.id);
  }

  async inbox(user: JwtUser, query: ListDirectMessagesDto) {
    return this.listBy(user, query, { recipientId: user.id });
  }

  async sent(user: JwtUser, query: ListDirectMessagesDto) {
    return this.listBy(user, query, { senderId: user.id });
  }

  async findOne(user: JwtUser, id: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!message || (message.senderId !== user.id && message.recipientId !== user.id && user.role !== UserRole.ADMIN)) {
      throw new NotFoundException('Message not found');
    }

    return this.toMessageDto(message);
  }

  async read(user: JwtUser, id: string) {
    const message = await this.prisma.directMessage.findUnique({ where: { id } });
    if (!message || (message.recipientId !== user.id && user.role !== UserRole.ADMIN)) {
      throw new NotFoundException('Message not found');
    }

    const updated = await this.prisma.directMessage.update({
      where: { id },
      data: { readAt: new Date() },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (message.recipientId === user.id) {
      await this.notificationsService.markDirectMessageNotificationRead(message.id, user.id);
    }

    await this.publishMessageInvalidation(message.recipientId, 'inbox', 'read', message.id);
    await this.publishMessageInvalidation(message.senderId, 'sent', 'read', message.id);

    return this.toMessageDto(updated);
  }

  private async listBy(user: JwtUser, query: ListDirectMessagesDto, where: { recipientId?: string; senderId?: string }) {
    const total = await this.prisma.directMessage.count({ where });
    const unreadCount =
      'recipientId' in where && where.recipientId
        ? await this.prisma.directMessage.count({
            where: { recipientId: where.recipientId, readAt: null },
          })
        : undefined;
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.directMessage.findMany({
      where,
      skip,
      take,
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(
      items.map((item) => this.toMessageDto(item)),
      unreadCount !== undefined ? { ...meta, unreadCount } : meta,
    );
  }

  private async resolveActiveRelationship(user: JwtUser, recipientId: string) {
    if (user.role === UserRole.STUDENT) {
      const relationship = await this.prisma.trainerStudent.findFirst({
        where: {
          trainerId: recipientId,
          studentId: user.id,
          status: TrainerStudentStatus.ACTIVE,
        },
      });

      if (!relationship) {
        throw new ForbiddenException('Student can only message active trainer');
      }

      return relationship;
    }

    if (user.role === UserRole.TRAINER) {
      const relationship = await this.prisma.trainerStudent.findFirst({
        where: {
          trainerId: user.id,
          studentId: recipientId,
          status: TrainerStudentStatus.ACTIVE,
        },
      });

      if (!relationship) {
        throw new ForbiddenException('Trainer can only message active students');
      }

      return relationship;
    }

    throw new ForbiddenException('Only students and trainers can send direct messages');
  }

  private toMessageDto(
    message: DirectMessage & {
      sender?: { id: string; fullName: string; role: UserRole };
      recipient?: { id: string; fullName: string; role: UserRole };
    },
  ) {
    return {
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender?.fullName ?? null,
      recipientId: message.recipientId,
      recipientName: message.recipient?.fullName ?? null,
      trainerId: message.trainerId,
      studentId: message.studentId,
      subject: message.subject,
      category: message.category,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
      meta: message.meta,
    };
  }

  private async publishMessageInvalidation(
    userId: string,
    box: 'inbox' | 'sent',
    reason: 'created' | 'read',
    messageId: string,
  ) {
    const unreadCount =
      box === 'inbox'
        ? await this.prisma.directMessage.count({
            where: { recipientId: userId, readAt: null },
          })
        : undefined;

    this.realtimeService.publishToUser(userId, {
      channel: 'messages',
      event: 'messages.invalidate',
      data: {
        box,
        reason,
        messageId,
        unreadCount,
      },
    });
  }
}
