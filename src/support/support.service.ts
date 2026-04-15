import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  SupportTicketStatus,
  UserRole,
  type Prisma,
  type SupportTicket,
} from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async createTicket(user: JwtUser, dto: CreateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: user.id,
        category: dto.category,
        subject: dto.subject,
        message: dto.message,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, role: true },
        },
      },
    });

    const emailSentAt = await this.trySendEmail(ticket);
    if (emailSentAt) {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { emailSentAt },
      });
      ticket.emailSentAt = emailSentAt;
    }

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, deletedAt: null },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notificationsService.createNotification({
        recipientId: admin.id,
        senderId: user.id,
        supportTicketId: ticket.id,
        type: NotificationType.SUPPORT,
        title: dto.subject ?? 'Novo ticket de suporte',
        body: dto.message.slice(0, 180),
        actionHref: '/support',
        actionLabel: 'Abrir ticket',
        meta: {
          supportTicketId: ticket.id,
          category: dto.category,
          openedByRole: user.role,
        },
      });
    }

    this.publishSupportInvalidation([user.id, ...admins.map((admin) => admin.id)], 'created', ticket.id, ticket.status);

    return this.toTicketDto(ticket);
  }

  async myTickets(user: JwtUser, query: ListSupportTicketsDto) {
    const where = {
      userId: user.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const total = await this.prisma.supportTicket.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.supportTicket.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(items.map((item) => this.toTicketDto(item)), meta);
  }

  async findOne(user: JwtUser, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, role: true },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (user.role !== UserRole.ADMIN && ticket.userId !== user.id) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.toTicketDto(ticket);
  }

  async updateStatus(user: JwtUser, id: string, dto: UpdateSupportTicketStatusDto) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can update support ticket status');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, role: true },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: dto.status },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, role: true },
        },
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, deletedAt: null },
      select: { id: true },
    });
    this.publishSupportInvalidation(
      [updated.userId, ...admins.map((admin) => admin.id)],
      'status-updated',
      updated.id,
      updated.status,
    );

    return this.toTicketDto(updated);
  }

  private async trySendEmail(
    ticket: SupportTicket & { user: { id: string; fullName: string; email: string; phone: string | null; role: UserRole } },
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY', '');
    const to = this.configService.get<string>('SUPPORT_TO_EMAIL', '');
    const from = this.configService.get<string>('SUPPORT_FROM_EMAIL', '');

    if (!apiKey || !to || !from) {
      return null;
    }

    const whatsappDigits = this.normalizeWhatsapp(ticket.user.phone);
    const whatsappDisplay = ticket.user.phone?.trim() || 'Nao informado';
    const whatsappLink = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `[VYTA Support] ${ticket.category} - ${ticket.subject ?? 'Sem assunto'}`,
          html: `
            <h2>Novo ticket de suporte</h2>
            <p><strong>Ticket:</strong> ${ticket.id}</p>
            <p><strong>Usuário:</strong> ${ticket.user.fullName} (${ticket.user.email})</p>
            <p><strong>Perfil:</strong> ${ticket.user.role}</p>
            <p><strong>WhatsApp:</strong> ${whatsappDisplay}</p>
            ${whatsappLink ? `<p><strong>Contato rápido:</strong> <a href="${whatsappLink}">${whatsappLink}</a></p>` : ''}
            <p><strong>Categoria:</strong> ${ticket.category}</p>
            <p><strong>Mensagem:</strong></p>
            <pre>${ticket.message}</pre>
          `,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Support email failed ticketId=${ticket.id} status=${response.status} body=${body}`);
        return null;
      }

      return new Date();
    } catch (error) {
      this.logger.error(
        `Support email failed ticketId=${ticket.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private toTicketDto(
    ticket: SupportTicket & { user?: { id: string; fullName: string; email: string; phone: string | null; role: UserRole } | null },
  ) {
    return {
      id: ticket.id,
      userId: ticket.userId,
      userName: ticket.user?.fullName ?? null,
      userEmail: ticket.user?.email ?? null,
      userPhone: ticket.user?.phone ?? null,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      emailSentAt: ticket.emailSentAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      meta: ticket.meta,
    };
  }

  private normalizeWhatsapp(phone?: string | null) {
    if (!phone) {
      return null;
    }

    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
  }

  private publishSupportInvalidation(
    userIds: string[],
    reason: 'created' | 'status-updated',
    ticketId: string,
    status: SupportTicketStatus,
  ) {
    this.realtimeService.publishToUsers(userIds, {
      channel: 'support',
      event: 'support.invalidate',
      data: {
        reason,
        ticketId,
        status,
      },
    });
  }
}
