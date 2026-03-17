import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, TrainerStudentStatus, UserRole } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListTrainerStudentsDto } from './dto/list-trainer-students.dto';
import { RequestTrainerStudentDto } from './dto/request-trainer-student.dto';
import { UpdateTrainerStudentStatusDto } from './dto/update-trainer-student-status.dto';

@Injectable()
export class TrainerStudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async request(user: JwtUser, dto: RequestTrainerStudentDto) {
    const trainerId =
      user.role === UserRole.STUDENT ? dto.trainerId : user.role === UserRole.TRAINER ? user.id : dto.trainerId;
    const studentId = user.role === UserRole.TRAINER ? dto.studentId : user.id;

    if (!trainerId || !studentId) {
      throw new NotFoundException('trainerId and studentId are required for this role');
    }

    if (trainerId === studentId) {
      throw new ForbiddenException('Trainer and student cannot be the same user');
    }

    const [trainer, student] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: trainerId }, select: { id: true, role: true, fullName: true } }),
      this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, role: true, fullName: true } }),
    ]);

    if (!trainer || trainer.role !== UserRole.TRAINER) {
      throw new NotFoundException('Trainer not found');
    }

    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    const existing = await this.prisma.trainerStudent.findUnique({
      where: { trainerId_studentId: { trainerId, studentId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Relationship already exists');
    }

    const activeRelation = await this.prisma.trainerStudent.findFirst({
      where: { studentId, status: TrainerStudentStatus.ACTIVE },
      select: { id: true },
    });
    if (activeRelation) {
      throw new ConflictException('Student already has an active trainer');
    }

    const relationship = await this.prisma.trainerStudent.create({
      data: { trainerId, studentId, status: TrainerStudentStatus.PENDING },
      include: {
        trainer: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        student: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: trainerId,
        type: NotificationType.TRAINER_MESSAGE,
        title: 'Nova solicitacao de acompanhamento',
        message: `${student.fullName} solicitou acompanhamento no VYTA.`,
        data: { trainerStudentId: relationship.id },
      },
    });

    return relationship;
  }

  async updateStatus(user: JwtUser, relationId: string, dto: UpdateTrainerStudentStatusDto) {
    const relation = await this.prisma.trainerStudent.findUnique({
      where: { id: relationId },
      include: {
        trainer: { select: { id: true, fullName: true } },
        student: { select: { id: true, fullName: true } },
      },
    });

    if (!relation) {
      throw new NotFoundException('Relationship not found');
    }

    if (user.role !== UserRole.ADMIN && user.id !== relation.trainerId) {
      throw new ForbiddenException('Only the trainer or admin can update this relationship');
    }

    if (dto.status === TrainerStudentStatus.ACTIVE) {
      const activeRelation = await this.prisma.trainerStudent.findFirst({
        where: {
          studentId: relation.studentId,
          status: TrainerStudentStatus.ACTIVE,
          id: { not: relation.id },
        },
      });

      if (activeRelation) {
        throw new ConflictException('Student already has an active trainer');
      }
    }

    const updated = await this.prisma.trainerStudent.update({
      where: { id: relation.id },
      data: {
        status: dto.status,
        startedAt: dto.status === TrainerStudentStatus.ACTIVE ? new Date() : relation.startedAt,
      },
      include: {
        trainer: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        student: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: relation.studentId,
        type: NotificationType.SYSTEM,
        title: 'Status de acompanhamento atualizado',
        message: `${relation.trainer.fullName} atualizou sua solicitacao para ${dto.status}.`,
        data: { trainerStudentId: relation.id, status: dto.status },
      },
    });

    return updated;
  }

  async list(user: JwtUser, query: ListTrainerStudentsDto) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(user.role === UserRole.ADMIN
        ? {}
        : user.role === UserRole.TRAINER
          ? { trainerId: user.id }
          : { studentId: user.id }),
    };

    const total = await this.prisma.trainerStudent.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const data = await this.prisma.trainerStudent.findMany({
      where,
      skip,
      take,
      include: {
        trainer: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        student: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(data, meta);
  }
}
