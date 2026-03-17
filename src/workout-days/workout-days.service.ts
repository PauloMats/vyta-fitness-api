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

    const existingDay = await this.prisma.workoutDay.findUnique({
      where: { workoutPlanId_weekDay: { workoutPlanId: planId, weekDay: dto.weekDay } },
      select: { id: true },
    });
    if (existingDay) {
      throw new ConflictException('A workout day already exists for this weekday');
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

    if (dto.weekDay && dto.weekDay !== day.weekDay) {
      const duplicate = await this.prisma.workoutDay.findUnique({
        where: { workoutPlanId_weekDay: { workoutPlanId: day.workoutPlanId, weekDay: dto.weekDay } },
      });
      if (duplicate) {
        throw new ConflictException('A workout day already exists for this weekday');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.exercises) {
        await tx.workoutExercise.deleteMany({ where: { workoutDayId: id } });
      }

      return tx.workoutDay.update({
        where: { id },
        data: {
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
