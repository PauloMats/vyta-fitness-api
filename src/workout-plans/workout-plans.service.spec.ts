import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, WorkoutPlanVisibility } from '@prisma/client';
import { WorkoutPlansService } from './workout-plans.service';

describe('WorkoutPlansService', () => {
  let prisma: any;
  let service: WorkoutPlansService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      trainerStudent: { findFirst: jest.fn() },
      workoutPlan: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new WorkoutPlansService(prisma);
  });

  it('creates plans for trainers and validates active student assignments', async () => {
    prisma.workoutPlan.create.mockResolvedValue({ id: 'plan-1' });

    const trainer = { id: 'trainer-1', role: UserRole.TRAINER } as any;
    await expect(
      service.create(trainer, {
        title: 'Template',
        isTemplate: true,
      } as any),
    ).resolves.toEqual({ id: 'plan-1' });

    prisma.user.findUnique.mockResolvedValue({ id: 'student-1', role: UserRole.STUDENT });
    prisma.trainerStudent.findFirst.mockResolvedValue(null);

    await expect(
      service.create(trainer, {
        title: 'Assigned plan',
        studentId: 'student-1',
      } as any),
    ).rejects.toThrow(new ConflictException('Trainer can only assign plans to active students'));
  });

  it('rejects plan creation for unauthorized roles', async () => {
    const student = { id: 'student-1', role: UserRole.STUDENT } as any;

    await expect(service.create(student, { title: 'Blocked' } as any)).rejects.toThrow(
      new ForbiddenException('Only trainers or admins can create workout plans'),
    );
  });

  it('scopes list queries by role and optional filters', async () => {
    prisma.workoutPlan.count.mockResolvedValue(1);
    prisma.workoutPlan.findMany.mockResolvedValue([{ id: 'plan-1' }]);

    const trainer = { id: 'trainer-1', role: UserRole.TRAINER } as any;
    const result = await service.list(trainer, {
      page: 1,
      limit: 10,
      search: 'hiper',
      studentId: 'student-1',
      isTemplate: false,
    } as any);

    expect(prisma.workoutPlan.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trainerId: 'trainer-1',
          studentId: 'student-1',
          isTemplate: false,
        }),
      }),
    );
    expect(result.items).toEqual([{ id: 'plan-1' }]);
  });

  it('handles read access, not found and update OCC conflicts', async () => {
    prisma.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne({ id: 'trainer-1', role: UserRole.TRAINER } as any, 'missing')).rejects.toThrow(
      new NotFoundException('Workout plan not found'),
    );

    prisma.workoutPlan.findUnique.mockResolvedValueOnce({
      id: 'public-template',
      trainerId: 'trainer-1',
      studentId: null,
      isTemplate: true,
      visibility: WorkoutPlanVisibility.PUBLIC,
    });

    await expect(service.findOne({ id: 'student-1', role: UserRole.STUDENT } as any, 'public-template')).resolves.toEqual(
      expect.objectContaining({ id: 'public-template' }),
    );

    prisma.workoutPlan.findUnique.mockResolvedValueOnce({
      id: 'plan-1',
      trainerId: 'trainer-1',
      studentId: 'student-1',
      isTemplate: false,
      visibility: WorkoutPlanVisibility.TRAINER_ONLY,
    });
    prisma.workoutPlan.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update({ id: 'trainer-1', role: UserRole.TRAINER } as any, 'plan-1', { version: 99 } as any),
    ).rejects.toThrow(new ConflictException('Workout plan was updated by another process'));
  });

  it('enforces manage/read permissions and removes plans', async () => {
    expect(() =>
      service.assertCanManagePlan(
        { id: 'trainer-2', role: UserRole.TRAINER } as any,
        { trainerId: 'trainer-1' } as any,
      ),
    ).toThrow(new ForbiddenException('Only the owner trainer can manage this workout plan'));

    expect(() =>
      service.assertCanReadPlan(
        { id: 'student-2', role: UserRole.STUDENT } as any,
        {
          trainerId: 'trainer-1',
          studentId: 'student-1',
          isTemplate: false,
          visibility: WorkoutPlanVisibility.PRIVATE,
        } as any,
      ),
    ).toThrow(new ForbiddenException('You do not have access to this workout plan'));

    prisma.workoutPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      trainerId: 'trainer-1',
    });
    prisma.workoutPlan.delete.mockResolvedValue(undefined);

    await expect(service.remove({ id: 'trainer-1', role: UserRole.TRAINER } as any, 'plan-1')).resolves.toEqual({
      message: 'Workout plan deleted successfully',
    });
  });
});
