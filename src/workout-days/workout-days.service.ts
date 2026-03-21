import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkoutPlansService } from '../workout-plans/workout-plans.service';
import { CreateWorkoutDayDto } from './dto/create-workout-day.dto';
import { UpdateWorkoutDayDto } from './dto/update-workout-day.dto';

@Injectable()
export class WorkoutDaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workoutPlansService: WorkoutPlansService,
  ) {}

  async create(user: JwtUser, planId: string, dto: CreateWorkoutDayDto) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Workout plan not found');
    }
    this.workoutPlansService.assertCanManagePlan(user, plan);

    const existingDay = await this.prisma.workoutDay.findFirst({
      where: { workoutPlanId: planId, order: dto.order },
      select: { id: true },
    });
    if (existingDay) {
      throw new ConflictException('A workout day already exists for this order');
    }

    return this.prisma.workoutDay.create({
      data: {
        workoutPlanId: planId,
        weekDay: dto.weekDay,
        order: dto.order,
        title: dto.title,
        focus: dto.focus,
        notes: dto.notes,
        estimatedMinutes: dto.estimatedMinutes,
        exercises: dto.exercises ? { create: dto.exercises } : undefined,
      },
      include: {
        exercises: {
          include: { exerciseLibrary: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async update(user: JwtUser, id: string, dto: UpdateWorkoutDayDto) {
    const day = await this.prisma.workoutDay.findUnique({
      where: { id },
      include: { workoutPlan: true },
    });
    if (!day) {
      throw new NotFoundException('Workout day not found');
    }
    this.workoutPlansService.assertCanManagePlan(user, day.workoutPlan);

    if (dto.order && dto.order !== day.order) {
      const duplicate = await this.prisma.workoutDay.findFirst({
        where: {
          workoutPlanId: day.workoutPlanId,
          order: dto.order,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException('A workout day already exists for this order');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.exercises) {
        await tx.workoutExercise.deleteMany({ where: { workoutDayId: id } });
      }

      const updated = await tx.workoutDay.updateMany({
        where: {
          id,
          ...(dto.version ? { version: dto.version } : {}),
        },
        data: {
          weekDay: dto.weekDay,
          order: dto.order,
          title: dto.title,
          focus: dto.focus,
          notes: dto.notes,
          estimatedMinutes: dto.estimatedMinutes,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Workout day was updated by another process');
      }

      if (dto.exercises) {
        await tx.workoutExercise.createMany({
          data: dto.exercises.map((exercise) => ({
            workoutDayId: id,
            ...exercise,
          })),
        });
      }

      return tx.workoutDay.findUniqueOrThrow({
        where: { id },
        include: {
          exercises: {
            include: { exerciseLibrary: true },
            orderBy: { order: 'asc' },
          },
        },
      });
    });
  }

  async remove(user: JwtUser, id: string) {
    const day = await this.prisma.workoutDay.findUnique({
      where: { id },
      include: { workoutPlan: true },
    });
    if (!day) {
      throw new NotFoundException('Workout day not found');
    }
    this.workoutPlansService.assertCanManagePlan(user, day.workoutPlan);
    await this.prisma.workoutDay.delete({ where: { id } });
    return { message: 'Workout day deleted successfully' };
  }
}
