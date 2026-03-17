import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, WorkoutSessionStatus, type WorkoutSession } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { workoutSessionInclude } from '../common/utils/prisma-selects';
import { PrismaService } from '../prisma/prisma.service';
import { WorkoutPlansService } from '../workout-plans/workout-plans.service';
import { CreateWorkoutSetDto } from './dto/create-workout-set.dto';
import { FinishWorkoutSessionDto } from './dto/finish-workout-session.dto';
import { ListWorkoutSessionsDto } from './dto/list-workout-sessions.dto';
import { StartWorkoutSessionDto } from './dto/start-workout-session.dto';

@Injectable()
export class WorkoutSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workoutPlansService: WorkoutPlansService,
  ) {}

  async start(user: JwtUser, dto: StartWorkoutSessionDto) {
    let workoutPlanId = dto.workoutPlanId;
    let workoutDayId = dto.workoutDayId;

    if (workoutPlanId) {
      const plan = await this.prisma.workoutPlan.findUnique({ where: { id: workoutPlanId } });
      if (!plan) {
        throw new NotFoundException('Workout plan not found');
      }
      this.workoutPlansService.assertCanReadPlan(user, plan);
    }

    if (workoutDayId) {
      const day = await this.prisma.workoutDay.findUnique({
        where: { id: workoutDayId },
        include: { workoutPlan: true },
      });
      if (!day) {
        throw new NotFoundException('Workout day not found');
      }
      this.workoutPlansService.assertCanReadPlan(user, day.workoutPlan);
      workoutPlanId = day.workoutPlanId;
    }

    const session = await this.prisma.workoutSession.create({
      data: {
        userId: user.id,
        workoutPlanId,
        workoutDayId,
        startedAt: new Date(),
        status: WorkoutSessionStatus.IN_PROGRESS,
        feelingPre: dto.feelingPre,
        notes: dto.notes,
      },
      include: workoutSessionInclude,
    });

    return session;
  }

  async addSet(user: JwtUser, sessionId: string, dto: CreateWorkoutSetDto) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { workoutDay: true },
    });
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    this.assertCanManageSession(user, session);

    if (session.status !== WorkoutSessionStatus.IN_PROGRESS) {
      throw new ConflictException('Only in-progress sessions can receive sets');
    }

    const exercise = await this.prisma.workoutExercise.findUnique({ where: { id: dto.workoutExerciseId } });
    if (!exercise) {
      throw new NotFoundException('Workout exercise not found');
    }
    if (session.workoutDayId && exercise.workoutDayId !== session.workoutDayId) {
      throw new ForbiddenException('Exercise does not belong to this workout session');
    }

    return this.prisma.workoutSet.create({
      data: {
        workoutSessionId: sessionId,
        workoutExerciseId: dto.workoutExerciseId,
        order: dto.order,
        targetReps: dto.targetReps,
        actualReps: dto.actualReps,
        targetLoadKg: dto.targetLoadKg,
        actualLoadKg: dto.actualLoadKg,
        restSeconds: dto.restSeconds,
        isWarmup: dto.isWarmup ?? false,
        completedAt: new Date(),
      },
      include: { workoutExercise: true },
    });
  }

  async finish(user: JwtUser, sessionId: string, dto: FinishWorkoutSessionDto) {
    const session = await this.prisma.workoutSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    this.assertCanManageSession(user, session);

    if (session.status !== WorkoutSessionStatus.IN_PROGRESS) {
      throw new ConflictException('Workout session is not in progress');
    }

    const finishedAt = new Date();
    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: WorkoutSessionStatus.COMPLETED,
        finishedAt,
        durationSeconds: Math.max(0, Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000)),
        feelingPost: dto.feelingPost,
        notes: dto.notes ?? session.notes,
      },
      include: workoutSessionInclude,
    });
  }

  async cancel(user: JwtUser, sessionId: string, dto: FinishWorkoutSessionDto) {
    const session = await this.prisma.workoutSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    this.assertCanManageSession(user, session);

    if (session.status !== WorkoutSessionStatus.IN_PROGRESS) {
      throw new ConflictException('Workout session is not in progress');
    }

    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: WorkoutSessionStatus.CANCELED,
        finishedAt: new Date(),
        notes: dto.notes ?? session.notes,
      },
      include: workoutSessionInclude,
    });
  }

  async listMine(user: JwtUser, query: ListWorkoutSessionsDto) {
    const where = {
      userId: user.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const total = await this.prisma.workoutSession.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const sessions = await this.prisma.workoutSession.findMany({
      where,
      skip,
      take,
      include: workoutSessionInclude,
      orderBy: { createdAt: 'desc' },
    });

    return paginated(sessions, meta);
  }

  async findOne(user: JwtUser, id: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id },
      include: workoutSessionInclude,
    });
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    this.assertCanReadSession(user, session);
    return session;
  }

  private assertCanManageSession(user: JwtUser, session: WorkoutSession) {
    if (user.role === UserRole.ADMIN || session.userId === user.id) {
      return;
    }
    throw new ForbiddenException('You cannot manage this workout session');
  }

  private assertCanReadSession(user: JwtUser, session: WorkoutSession & { workoutPlan?: { trainerId: string } | null }) {
    if (user.role === UserRole.ADMIN || session.userId === user.id) {
      return;
    }

    if (user.role === UserRole.TRAINER && session.workoutPlan?.trainerId === user.id) {
      return;
    }

    throw new ForbiddenException('You cannot read this workout session');
  }
}
