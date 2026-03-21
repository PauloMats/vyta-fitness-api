import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrainerStudentStatus, UserRole, WorkoutPlanVisibility, type WorkoutPlan } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { workoutPlanInclude } from '../common/utils/prisma-selects';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { ListWorkoutPlansDto } from './dto/list-workout-plans.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';

@Injectable()
export class WorkoutPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: JwtUser, dto: CreateWorkoutPlanDto) {
    const trainerId = this.resolveTrainerId(user, dto.trainerId);

    if (dto.studentId) {
      await this.ensureStudentAssignmentAllowed(user, trainerId, dto.studentId);
    }

    const plan = await this.prisma.workoutPlan.create({
      data: {
        trainerId,
        studentId: dto.studentId,
        title: dto.title,
        description: dto.description,
        goal: dto.goal,
        visibility: dto.visibility,
        isTemplate: dto.isTemplate ?? false,
        days: dto.days
          ? {
              create: dto.days.map((day) => ({
                weekDay: day.weekDay,
                order: day.order,
                title: day.title,
                focus: day.focus,
                notes: day.notes,
                estimatedMinutes: day.estimatedMinutes,
                exercises: day.exercises ? { create: day.exercises } : undefined,
              })),
            }
          : undefined,
      },
      include: workoutPlanInclude,
    });

    return plan;
  }

  async list(user: JwtUser, query: ListWorkoutPlansDto) {
    const where = {
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(typeof query.isTemplate === 'boolean' ? { isTemplate: query.isTemplate } : {}),
      ...(user.role === UserRole.ADMIN
        ? { ...(query.studentId ? { studentId: query.studentId } : {}) }
        : user.role === UserRole.TRAINER
          ? { trainerId: user.id, ...(query.studentId ? { studentId: query.studentId } : {}) }
          : { studentId: user.id }),
    };

    const total = await this.prisma.workoutPlan.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const plans = await this.prisma.workoutPlan.findMany({
      where,
      skip,
      take,
      include: workoutPlanInclude,
      orderBy: { createdAt: 'desc' },
    });

    return paginated(plans, meta);
  }

  async findOne(user: JwtUser, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: workoutPlanInclude,
    });

    if (!plan) {
      throw new NotFoundException('Workout plan not found');
    }

    this.assertCanReadPlan(user, plan);
    return plan;
  }

  async update(user: JwtUser, id: string, dto: UpdateWorkoutPlanDto) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Workout plan not found');
    }

    this.assertCanManagePlan(user, plan);

    if (dto.studentId) {
      await this.ensureStudentAssignmentAllowed(user, plan.trainerId, dto.studentId);
    }

    const result = await this.prisma.workoutPlan.updateMany({
      where: {
        id,
        ...(dto.version ? { version: dto.version } : {}),
      },
      data: {
        title: dto.title,
        description: dto.description,
        goal: dto.goal,
        visibility: dto.visibility,
        isTemplate: dto.isTemplate,
        studentId: dto.studentId,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Workout plan was updated by another process');
    }

    return this.prisma.workoutPlan.findUniqueOrThrow({
      where: { id },
      include: workoutPlanInclude,
    });
  }

  async remove(user: JwtUser, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Workout plan not found');
    }
    this.assertCanManagePlan(user, plan);
    await this.prisma.workoutPlan.delete({ where: { id } });
    return { message: 'Workout plan deleted successfully' };
  }

  assertCanManagePlan(user: JwtUser, plan: WorkoutPlan) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role !== UserRole.TRAINER || plan.trainerId !== user.id) {
      throw new ForbiddenException('Only the owner trainer can manage this workout plan');
    }
  }

  assertCanReadPlan(user: JwtUser, plan: WorkoutPlan) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.TRAINER && plan.trainerId === user.id) {
      return;
    }

    if (user.role === UserRole.STUDENT && plan.studentId === user.id) {
      return;
    }

    if (plan.isTemplate && plan.visibility === WorkoutPlanVisibility.PUBLIC) {
      return;
    }

    throw new ForbiddenException('You do not have access to this workout plan');
  }

  private resolveTrainerId(user: JwtUser, trainerId?: string) {
    if (user.role === UserRole.TRAINER) {
      return user.id;
    }

    if (user.role === UserRole.ADMIN && trainerId) {
      return trainerId;
    }

    throw new ForbiddenException('Only trainers or admins can create workout plans');
  }

  private async ensureStudentAssignmentAllowed(user: JwtUser, trainerId: string, studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    if (user.role === UserRole.ADMIN) {
      return;
    }

    const activeRelationship = await this.prisma.trainerStudent.findFirst({
      where: {
        trainerId,
        studentId,
        status: TrainerStudentStatus.ACTIVE,
      },
    });

    if (!activeRelationship) {
      throw new ConflictException('Trainer can only assign plans to active students');
    }
  }
}
