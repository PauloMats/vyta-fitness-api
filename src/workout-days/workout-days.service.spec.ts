import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkoutDaysService } from './workout-days.service';

describe('WorkoutDaysService', () => {
  let prisma: any;
  let workoutPlansService: any;
  let service: WorkoutDaysService;

  const trainerUser = { id: 'trainer-1', role: 'TRAINER' } as any;

  beforeEach(() => {
    prisma = {
      workoutPlan: { findUnique: jest.fn() },
      workoutDay: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    workoutPlansService = {
      assertCanManagePlan: jest.fn(),
    };
    service = new WorkoutDaysService(prisma, workoutPlansService);
  });

  it('creates a workout day with nested exercises', async () => {
    prisma.workoutPlan.findUnique.mockResolvedValue({ id: 'plan-1', trainerId: 'trainer-1' });
    prisma.workoutDay.findFirst.mockResolvedValue(null);
    prisma.workoutDay.create.mockResolvedValue({ id: 'day-1' });

    const dto = {
      weekDay: 1,
      order: 1,
      title: 'Upper',
      focus: 'Chest',
      estimatedMinutes: 50,
      notes: 'Heavy day',
      exercises: [
        {
          order: 1,
          nameSnapshot: 'Bench Press',
          sets: 4,
          reps: '8',
          restSeconds: 90,
        },
      ],
    };

    const result = await service.create(trainerUser, 'plan-1', dto as any);

    expect(result).toEqual({ id: 'day-1' });
    expect(workoutPlansService.assertCanManagePlan).toHaveBeenCalledWith(trainerUser, {
      id: 'plan-1',
      trainerId: 'trainer-1',
    });
    expect(prisma.workoutDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workoutPlanId: 'plan-1',
          exercises: { create: dto.exercises },
        }),
      }),
    );
  });

  it('rejects creation when plan is missing or order is duplicated', async () => {
    prisma.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(service.create(trainerUser, 'missing-plan', { order: 1 } as any)).rejects.toThrow(
      new NotFoundException('Workout plan not found'),
    );

    prisma.workoutPlan.findUnique.mockResolvedValueOnce({ id: 'plan-1', trainerId: 'trainer-1' });
    prisma.workoutDay.findFirst.mockResolvedValueOnce({ id: 'day-existing' });

    await expect(service.create(trainerUser, 'plan-1', { order: 1 } as any)).rejects.toThrow(
      new ConflictException('A workout day already exists for this order'),
    );
  });

  it('updates a workout day with OCC and replaces exercises', async () => {
    prisma.workoutDay.findUnique.mockResolvedValue({
      id: 'day-1',
      order: 1,
      workoutPlanId: 'plan-1',
      workoutPlan: { id: 'plan-1', trainerId: 'trainer-1' },
    });
    prisma.workoutDay.findFirst.mockResolvedValue(null);

    const tx = {
      workoutExercise: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      workoutDay: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'day-1', order: 2 }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    const result = await service.update(trainerUser, 'day-1', {
      order: 2,
      version: 3,
      exercises: [
        {
          order: 1,
          nameSnapshot: 'Leg Press',
          sets: 4,
          reps: '10',
          restSeconds: 90,
        },
      ],
    } as any);

    expect(result).toEqual({ id: 'day-1', order: 2 });
    expect(tx.workoutExercise.deleteMany).toHaveBeenCalledWith({ where: { workoutDayId: 'day-1' } });
    expect(tx.workoutDay.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'day-1', version: 3 },
      }),
    );
    expect(tx.workoutExercise.createMany).toHaveBeenCalledWith({
      data: [
        {
          workoutDayId: 'day-1',
          order: 1,
          nameSnapshot: 'Leg Press',
          sets: 4,
          reps: '10',
          restSeconds: 90,
        },
      ],
    });
  });

  it('detects duplicate order and OCC conflicts while updating', async () => {
    prisma.workoutDay.findUnique.mockResolvedValue({
      id: 'day-1',
      order: 1,
      workoutPlanId: 'plan-1',
      workoutPlan: { id: 'plan-1', trainerId: 'trainer-1' },
    });
    prisma.workoutDay.findFirst.mockResolvedValueOnce({ id: 'another-day' });

    await expect(service.update(trainerUser, 'day-1', { order: 2 } as any)).rejects.toThrow(
      new ConflictException('A workout day already exists for this order'),
    );

    prisma.workoutDay.findFirst.mockResolvedValueOnce(null);
    prisma.$transaction.mockImplementation(async (callback: (client: any) => unknown) =>
      callback({
        workoutExercise: { deleteMany: jest.fn(), createMany: jest.fn() },
        workoutDay: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUniqueOrThrow: jest.fn(),
        },
      }),
    );

    await expect(service.update(trainerUser, 'day-1', { version: 99 } as any)).rejects.toThrow(
      new ConflictException('Workout day was updated by another process'),
    );
  });

  it('removes a workout day after ownership validation', async () => {
    prisma.workoutDay.findUnique.mockResolvedValue({
      id: 'day-1',
      workoutPlan: { id: 'plan-1', trainerId: 'trainer-1' },
    });
    prisma.workoutDay.delete.mockResolvedValue(undefined);

    await expect(service.remove(trainerUser, 'day-1')).resolves.toEqual({
      message: 'Workout day deleted successfully',
    });
    expect(prisma.workoutDay.delete).toHaveBeenCalledWith({ where: { id: 'day-1' } });
  });
});
