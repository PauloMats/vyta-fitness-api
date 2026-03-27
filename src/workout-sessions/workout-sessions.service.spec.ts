import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, WorkoutSessionStatus } from '@prisma/client';
import { WorkoutSessionsService } from './workout-sessions.service';

describe('WorkoutSessionsService', () => {
  let prisma: any;
  let workoutPlansService: any;
  let service: WorkoutSessionsService;

  beforeEach(() => {
    prisma = {
      workoutPlan: { findUnique: jest.fn() },
      workoutDay: { findUnique: jest.fn() },
      workoutSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      workoutExercise: { findUnique: jest.fn() },
      workoutSet: { create: jest.fn() },
    };
    workoutPlansService = {
      assertCanReadPlan: jest.fn(),
    };
    service = new WorkoutSessionsService(prisma, workoutPlansService);
  });

  it('starts sessions from a workout day and validates plan visibility', async () => {
    prisma.workoutDay.findUnique.mockResolvedValue({
      id: 'day-1',
      workoutPlanId: 'plan-1',
      workoutPlan: { id: 'plan-1', trainerId: 'trainer-1' },
    });
    prisma.workoutSession.create.mockResolvedValue({ id: 'session-1', workoutPlanId: 'plan-1', workoutDayId: 'day-1' });

    const result = await service.start({ id: 'student-1', role: UserRole.STUDENT } as any, {
      workoutDayId: 'day-1',
      feelingPre: 4,
    } as any);

    expect(result).toEqual({ id: 'session-1', workoutPlanId: 'plan-1', workoutDayId: 'day-1' });
    expect(workoutPlansService.assertCanReadPlan).toHaveBeenCalledWith(
      { id: 'student-1', role: UserRole.STUDENT },
      { id: 'plan-1', trainerId: 'trainer-1' },
    );
  });

  it('rejects missing plans and days when starting sessions', async () => {
    prisma.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.start({ id: 'student-1', role: UserRole.STUDENT } as any, { workoutPlanId: 'missing' } as any),
    ).rejects.toThrow(new NotFoundException('Workout plan not found'));

    prisma.workoutDay.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.start({ id: 'student-1', role: UserRole.STUDENT } as any, { workoutDayId: 'missing-day' } as any),
    ).rejects.toThrow(new NotFoundException('Workout day not found'));
  });

  it('adds sets and rejects invalid session/exercise states', async () => {
    prisma.workoutSession.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.addSet({ id: 'student-1', role: UserRole.STUDENT } as any, 'missing-session', {
        workoutExerciseId: 'exercise-1',
      } as any),
    ).rejects.toThrow(new NotFoundException('Workout session not found'));

    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'student-1',
      status: WorkoutSessionStatus.COMPLETED,
      workoutDayId: 'day-1',
    });

    await expect(
      service.addSet({ id: 'student-1', role: UserRole.STUDENT } as any, 'session-1', {
        workoutExerciseId: 'exercise-1',
      } as any),
    ).rejects.toThrow(new ConflictException('Only in-progress sessions can receive sets'));

    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'student-1',
      status: WorkoutSessionStatus.IN_PROGRESS,
      workoutDayId: 'day-1',
    });
    prisma.workoutExercise.findUnique.mockResolvedValueOnce({ id: 'exercise-1', workoutDayId: 'day-2' });

    await expect(
      service.addSet({ id: 'student-1', role: UserRole.STUDENT } as any, 'session-1', {
        workoutExerciseId: 'exercise-1',
      } as any),
    ).rejects.toThrow(new ForbiddenException('Exercise does not belong to this workout session'));

    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'student-1',
      status: WorkoutSessionStatus.IN_PROGRESS,
      workoutDayId: 'day-1',
    });
    prisma.workoutExercise.findUnique.mockResolvedValueOnce({ id: 'exercise-1', workoutDayId: 'day-1' });
    prisma.workoutSet.create.mockResolvedValue({ id: 'set-1' });

    await expect(
      service.addSet({ id: 'student-1', role: UserRole.STUDENT } as any, 'session-1', {
        workoutExerciseId: 'exercise-1',
        order: 1,
      } as any),
    ).resolves.toEqual({ id: 'set-1' });
  });

  it('finishes and cancels sessions with status validation', async () => {
    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'student-1',
      status: WorkoutSessionStatus.COMPLETED,
      startedAt: new Date(),
    });

    await expect(
      service.finish({ id: 'student-1', role: UserRole.STUDENT } as any, 'session-1', {} as any),
    ).rejects.toThrow(new ConflictException('Workout session is not in progress'));

    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-2',
      userId: 'student-1',
      status: WorkoutSessionStatus.IN_PROGRESS,
      notes: 'old note',
      startedAt: new Date(Date.now() - 5_000),
    });
    prisma.workoutSession.update.mockResolvedValue({ id: 'session-2', status: WorkoutSessionStatus.CANCELED });

    await expect(
      service.cancel({ id: 'student-1', role: UserRole.STUDENT } as any, 'session-2', { notes: 'stop' } as any),
    ).resolves.toEqual({ id: 'session-2', status: WorkoutSessionStatus.CANCELED });
  });

  it('lists current user sessions and restricts read access', async () => {
    prisma.workoutSession.count.mockResolvedValue(1);
    prisma.workoutSession.findMany.mockResolvedValue([{ id: 'session-1' }]);

    const listResult = await service.listMine(
      { id: 'student-1', role: UserRole.STUDENT } as any,
      { page: 1, limit: 10, status: WorkoutSessionStatus.COMPLETED } as any,
    );

    expect(listResult.items).toEqual([{ id: 'session-1' }]);

    prisma.workoutSession.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne({ id: 'student-1', role: UserRole.STUDENT } as any, 'missing')).rejects.toThrow(
      new NotFoundException('Workout session not found'),
    );

    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-2',
      userId: 'student-2',
      workoutPlan: { trainerId: 'trainer-1' },
    });
    await expect(service.findOne({ id: 'trainer-1', role: UserRole.TRAINER } as any, 'session-2')).resolves.toEqual(
      expect.objectContaining({ id: 'session-2' }),
    );

    prisma.workoutSession.findUnique.mockResolvedValueOnce({
      id: 'session-3',
      userId: 'student-2',
      workoutPlan: { trainerId: 'trainer-1' },
    });
    await expect(service.findOne({ id: 'trainer-2', role: UserRole.TRAINER } as any, 'session-3')).rejects.toThrow(
      new ForbiddenException('You cannot read this workout session'),
    );
  });
});
