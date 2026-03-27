import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  BodyCompositionMethod,
  FitnessTestCategory,
  MeasurementSide,
  ScreeningClearance,
  TrainerStudentStatus,
  UserRole,
} from '@prisma/client';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService', () => {
  let prisma: any;
  let service: AssessmentsService;

  const trainerUser = { id: 'trainer-1', role: UserRole.TRAINER } as any;
  const studentUser = { id: 'student-1', role: UserRole.STUDENT } as any;
  const adminUser = { id: 'admin-1', role: UserRole.ADMIN } as any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      user: {
        findFirst: jest.fn(),
      },
      trainerStudent: {
        findFirst: jest.fn(),
      },
      physicalAssessment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      assessmentScreening: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      assessmentAnamnesis: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      assessmentVitals: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      assessmentCircumference: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      assessmentSkinfold: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      assessmentBodyComposition: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      assessmentFitnessTest: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      assessmentPhoto: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      assessmentReport: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      studentProfile: {
        upsert: jest.fn(),
      },
    };
    service = new AssessmentsService(prisma);
  });

  it('creates a full assessment snapshot for an active trainer-student relationship', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: studentUser.id });
    prisma.trainerStudent.findFirst.mockResolvedValue({
      id: 'rel-1',
      status: TrainerStudentStatus.ACTIVE,
    });

    const tx = {
      physicalAssessment: {
        create: jest.fn().mockResolvedValue({ id: 'assessment-1', vitals: null }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'assessment-1', status: AssessmentStatus.DRAFT }),
      },
      assessmentScreening: { create: jest.fn() },
      assessmentAnamnesis: { create: jest.fn() },
      assessmentVitals: { create: jest.fn() },
      assessmentCircumference: { createMany: jest.fn() },
      assessmentSkinfold: { createMany: jest.fn() },
      assessmentBodyComposition: { create: jest.fn() },
      assessmentFitnessTest: { createMany: jest.fn() },
      assessmentPhoto: { createMany: jest.fn() },
      assessmentReport: { create: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    const result = await service.create(trainerUser, {
      studentId: studentUser.id,
      assessmentDate: '2026-03-20T10:00:00.000Z',
      assessmentType: AssessmentType.INITIAL,
      notes: 'Initial evaluation',
      screening: {
        symptoms: 'None',
        knownConditions: 'None',
        medications: 'None',
        clearance: ScreeningClearance.CLEARED,
        riskFlags: ['low-risk'],
      },
      anamnesis: {
        objectivePrimary: 'Hypertrophy',
        activityLevel: 'Moderate',
        sleepQuality: 'Good',
        stressLevel: 3,
      },
      vitals: {
        weightKg: 82.5,
        heightCm: 178,
        restingHeartRate: 60,
      },
      circumferences: [
        {
          kind: 'WAIST',
          valueCm: 84.2,
          side: MeasurementSide.NONE,
          order: 1,
        },
      ],
      skinfolds: [
        {
          kind: 'ABDOMINAL',
          valueMm: 12.4,
          side: MeasurementSide.NONE,
          measurementIndex: 1,
        },
      ],
      bodyComposition: {
        method: BodyCompositionMethod.BIA,
        bodyFatPercent: 16.8,
        isComparable: true,
      },
      fitnessTests: [
        {
          category: FitnessTestCategory.STRENGTH,
          testCode: 'bench-5rm',
          name: 'Bench 5RM',
          rawValue: '90',
          unit: 'kg',
        },
      ],
      photos: [
        {
          mediaAssetId: 'media-1',
          position: 'FRONT',
        },
      ],
      report: {
        summary: 'Good condition',
        recommendations: 'Keep progression',
      },
    } as any);

    expect(result).toEqual({ id: 'assessment-1', status: AssessmentStatus.DRAFT });
    expect(tx.physicalAssessment.create).toHaveBeenCalled();
    expect(tx.assessmentScreening.create).toHaveBeenCalled();
    expect(tx.assessmentAnamnesis.create).toHaveBeenCalled();
    expect(tx.assessmentVitals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assessmentId: 'assessment-1',
          bmi: expect.any(Number),
        }),
      }),
    );
    expect(tx.assessmentCircumference.createMany).toHaveBeenCalled();
    expect(tx.assessmentSkinfold.createMany).toHaveBeenCalled();
    expect(tx.assessmentBodyComposition.create).toHaveBeenCalled();
    expect(tx.assessmentFitnessTest.createMany).toHaveBeenCalled();
    expect(tx.assessmentPhoto.createMany).toHaveBeenCalled();
    expect(tx.assessmentReport.create).toHaveBeenCalled();
  });

  it('rejects creation for admins without trainerId and for non-trainer users', async () => {
    await expect(
      service.create(adminUser, {
        studentId: studentUser.id,
        assessmentDate: '2026-03-20T10:00:00.000Z',
      } as any),
    ).rejects.toThrow(new NotFoundException('trainerId is required for admin-created assessments'));

    await expect(
      service.create(studentUser, {
        studentId: studentUser.id,
        assessmentDate: '2026-03-20T10:00:00.000Z',
      } as any),
    ).rejects.toThrow(new ForbiddenException('Only trainers or admins can create assessments'));
  });

  it('updates draft assessments, replaces nested collections and enforces OCC', async () => {
    prisma.physicalAssessment.findUnique
      .mockResolvedValueOnce({
        id: 'assessment-1',
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        status: AssessmentStatus.DRAFT,
        vitals: null,
      })
      .mockResolvedValueOnce({
        id: 'assessment-2',
        trainerId: 'trainer-2',
        studentId: studentUser.id,
        status: AssessmentStatus.DRAFT,
        vitals: null,
      })
      .mockResolvedValueOnce({
        id: 'assessment-3',
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        status: AssessmentStatus.COMPLETED,
        vitals: null,
      })
      .mockResolvedValueOnce({
        id: 'assessment-4',
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        status: AssessmentStatus.DRAFT,
        vitals: null,
      });

    const tx = {
      physicalAssessment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'assessment-1', version: 2 }),
      },
      assessmentScreening: { upsert: jest.fn() },
      assessmentAnamnesis: { upsert: jest.fn() },
      assessmentVitals: { upsert: jest.fn() },
      assessmentCircumference: { deleteMany: jest.fn(), createMany: jest.fn() },
      assessmentSkinfold: { deleteMany: jest.fn(), createMany: jest.fn() },
      assessmentBodyComposition: { upsert: jest.fn() },
      assessmentFitnessTest: { deleteMany: jest.fn(), createMany: jest.fn() },
      assessmentPhoto: { deleteMany: jest.fn(), createMany: jest.fn() },
      assessmentReport: { upsert: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(
      service.update(trainerUser, 'assessment-1', {
        version: 1,
        notes: 'Updated',
        screening: { symptoms: 'None', riskFlags: ['ok'] },
        anamnesis: { objectivePrimary: 'Cut' },
        vitals: { weightKg: 80.1, heightCm: 178 },
        circumferences: [{ kind: 'WAIST', valueCm: 82.1, order: 1 }],
        skinfolds: [{ kind: 'ABDOMINAL', valueMm: 10.2 }],
        bodyComposition: { method: BodyCompositionMethod.BIA, isComparable: true },
        fitnessTests: [
          {
            category: FitnessTestCategory.CARDIO,
            testCode: 'cooper',
            name: 'Cooper',
          },
        ],
        photos: [{ mediaAssetId: 'media-1', position: 'FRONT' }],
        report: { summary: 'Updated summary' },
      } as any),
    ).resolves.toEqual({ id: 'assessment-1', version: 2 });

    expect(tx.assessmentCircumference.deleteMany).toHaveBeenCalledWith({ where: { assessmentId: 'assessment-1' } });
    expect(tx.assessmentSkinfold.deleteMany).toHaveBeenCalledWith({ where: { assessmentId: 'assessment-1' } });
    expect(tx.assessmentFitnessTest.deleteMany).toHaveBeenCalledWith({ where: { assessmentId: 'assessment-1' } });
    expect(tx.assessmentPhoto.deleteMany).toHaveBeenCalledWith({ where: { assessmentId: 'assessment-1' } });

    await expect(service.update(trainerUser, 'assessment-2', {} as any)).rejects.toThrow(
      new ForbiddenException('Only the owner trainer can manage this assessment'),
    );

    await expect(service.update(trainerUser, 'assessment-3', {} as any)).rejects.toThrow(
      new ConflictException('Only draft assessments can be updated'),
    );

    tx.physicalAssessment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.update(trainerUser, 'assessment-4', { version: 99 } as any)).rejects.toThrow(
      new ConflictException('Assessment was updated by another process'),
    );
  });

  it('completes draft assessments, mirrors latest vitals to student profile and enforces state rules', async () => {
    prisma.physicalAssessment.findUnique
      .mockResolvedValueOnce({
        id: 'assessment-1',
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        status: AssessmentStatus.DRAFT,
        vitals: {
          heightCm: 178,
          weightKg: 79.4,
        },
      })
      .mockResolvedValueOnce({
        id: 'assessment-2',
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        status: AssessmentStatus.COMPLETED,
        vitals: null,
      })
      .mockResolvedValueOnce({
        id: 'assessment-3',
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        status: AssessmentStatus.DRAFT,
        vitals: null,
      });

    const tx = {
      physicalAssessment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'assessment-1', status: AssessmentStatus.COMPLETED }),
      },
      studentProfile: {
        upsert: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(service.complete(trainerUser, 'assessment-1', { version: 1 } as any)).resolves.toEqual({
      id: 'assessment-1',
      status: AssessmentStatus.COMPLETED,
    });
    expect(tx.studentProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: studentUser.id },
      }),
    );

    await expect(service.complete(trainerUser, 'assessment-2', {} as any)).rejects.toThrow(
      new ConflictException('Only draft assessments can be completed'),
    );

    tx.physicalAssessment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.complete(trainerUser, 'assessment-3', { version: 99 } as any)).rejects.toThrow(
      new ConflictException('Assessment was updated by another process'),
    );
  });

  it('finds, lists and blocks assessment reads according to ownership', async () => {
    prisma.physicalAssessment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'assessment-1',
        studentId: studentUser.id,
        trainerId: trainerUser.id,
      })
      .mockResolvedValueOnce({
        id: 'assessment-2',
        studentId: 'student-2',
        trainerId: 'trainer-2',
      });

    await expect(service.findOne(trainerUser, 'missing')).rejects.toThrow(new NotFoundException('Assessment not found'));

    await expect(service.findOne(studentUser, 'assessment-1')).resolves.toEqual({
      id: 'assessment-1',
      studentId: studentUser.id,
      trainerId: trainerUser.id,
    });

    await expect(service.findOne(studentUser, 'assessment-2')).rejects.toThrow(
      new ForbiddenException('You do not have access to this assessment'),
    );

    prisma.physicalAssessment.count.mockResolvedValue(1);
    prisma.physicalAssessment.findMany.mockResolvedValue([{ id: 'assessment-1' }]);

    await expect(
      service.listForStudent(
        { id: 'student-2', role: UserRole.STUDENT } as any,
        studentUser.id,
        { page: 1, limit: 10 } as any,
      ),
    ).rejects.toThrow(new ForbiddenException('Students can only access their own assessments'));

    prisma.user.findFirst.mockResolvedValue({ id: studentUser.id });
    prisma.trainerStudent.findFirst.mockResolvedValue({ id: 'rel-1' });

    await expect(
      service.listForStudent(trainerUser, studentUser.id, {
        page: 1,
        limit: 10,
        status: AssessmentStatus.COMPLETED,
      } as any),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [{ id: 'assessment-1' }],
      }),
    );
  });

  it('builds progress deltas and returns null deltas when no completed assessments exist', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: studentUser.id });
    prisma.trainerStudent.findFirst.mockResolvedValue({ id: 'rel-1' });
    prisma.physicalAssessment.findMany
      .mockResolvedValueOnce([
        {
          id: 'latest',
          vitals: { weightKg: 78.5 },
          bodyComposition: { bodyFatPercent: 15.1 },
          circumferences: [{ valueCm: 80.2 }],
        },
        {
          id: 'previous',
          vitals: { weightKg: 81 },
          bodyComposition: { bodyFatPercent: 17.5 },
          circumferences: [{ valueCm: 84.1 }],
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.progress(trainerUser, studentUser.id);
    expect(result.latest.id).toBe('latest');
    expect(result.previous.id).toBe('previous');
    expect(result.deltas?.weightKg).toBeCloseTo(-2.5);
    expect(result.deltas?.bodyFatPercent).toBeCloseTo(-2.4);
    expect(result.deltas?.waistCm).toBeCloseTo(-3.9);

    const empty = await service.progress(adminUser, studentUser.id);
    expect(empty).toEqual({
      latest: undefined,
      previous: undefined,
      deltas: null,
    });
  });

  it('rejects operations when referenced entities do not exist or do not belong to the trainer', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(adminUser, {
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        assessmentDate: '2026-03-20T10:00:00.000Z',
      } as any),
    ).rejects.toThrow(new NotFoundException('Trainer not found'));

    prisma.user.findFirst.mockResolvedValueOnce({ id: trainerUser.id }).mockResolvedValueOnce(null);
    await expect(
      service.create(adminUser, {
        trainerId: trainerUser.id,
        studentId: studentUser.id,
        assessmentDate: '2026-03-20T10:00:00.000Z',
      } as any),
    ).rejects.toThrow(new NotFoundException('Student not found'));

    prisma.user.findFirst.mockResolvedValue({ id: studentUser.id });
    prisma.trainerStudent.findFirst.mockResolvedValue(null);
    await expect(
      service.listForStudent(trainerUser, studentUser.id, { page: 1, limit: 10 } as any),
    ).rejects.toThrow(new ForbiddenException('Student does not belong to this trainer'));
  });
});
