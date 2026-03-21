import {
  AssessmentStatus,
  Prisma,
  TrainerStudentStatus,
  UserRole,
  type PhysicalAssessment,
} from '@prisma/client';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteAssessmentDto } from './dto/complete-assessment.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ListStudentAssessmentsDto } from './dto/list-student-assessments.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

const assessmentInclude = {
  student: {
    select: { id: true, fullName: true, username: true, avatarUrl: true },
  },
  trainer: {
    select: { id: true, fullName: true, username: true, avatarUrl: true },
  },
  screening: true,
  anamnesis: true,
  vitals: true,
  circumferences: { orderBy: { order: 'asc' as const } },
  skinfolds: { orderBy: { measurementIndex: 'asc' as const } },
  bodyComposition: true,
  fitnessTests: { orderBy: { createdAt: 'asc' as const } },
  photos: {
    include: {
      mediaAsset: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  report: true,
} satisfies Prisma.PhysicalAssessmentInclude;

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: JwtUser, dto: CreateAssessmentDto) {
    const trainerId = await this.resolveTrainerId(user, dto.studentId, dto.trainerId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.physicalAssessment.create({
        data: {
          studentId: dto.studentId,
          trainerId,
          assessmentDate: new Date(dto.assessmentDate),
          assessmentType: dto.assessmentType,
          notes: dto.notes,
        },
        include: { vitals: true },
      });

      if (dto.screening) {
        await tx.assessmentScreening.create({
          data: {
            assessmentId: created.id,
            ...this.mapScreening(dto.screening),
          },
        });
      }

      if (dto.anamnesis) {
        await tx.assessmentAnamnesis.create({
          data: {
            assessmentId: created.id,
            ...this.mapAnamnesis(dto.anamnesis),
          },
        });
      }

      if (dto.vitals) {
        await tx.assessmentVitals.create({
          data: {
            assessmentId: created.id,
            ...dto.vitals,
            bmi: this.calculateBmi(dto.vitals.weightKg, dto.vitals.heightCm),
          },
        });
      }

      if (dto.circumferences?.length) {
        await tx.assessmentCircumference.createMany({
          data: dto.circumferences.map((item) => ({
            assessmentId: created.id,
            kind: item.kind,
            valueCm: item.valueCm,
            side: item.side ?? 'NONE',
            protocol: item.protocol,
            order: item.order,
          })),
        });
      }

      if (dto.skinfolds?.length) {
        await tx.assessmentSkinfold.createMany({
          data: dto.skinfolds.map((item) => ({
            assessmentId: created.id,
            kind: item.kind,
            valueMm: item.valueMm,
            side: item.side ?? 'NONE',
            measurementIndex: item.measurementIndex ?? 1,
            protocol: item.protocol,
          })),
        });
      }

      if (dto.bodyComposition) {
        await tx.assessmentBodyComposition.create({
          data: {
            assessmentId: created.id,
            ...dto.bodyComposition,
          },
        });
      }

      if (dto.fitnessTests?.length) {
        await tx.assessmentFitnessTest.createMany({
          data: dto.fitnessTests.map((item) => ({
            assessmentId: created.id,
            category: item.category,
            testCode: item.testCode,
            name: item.name,
            rawValue: item.rawValue,
            unit: item.unit,
            score: item.score,
            notes: item.notes,
            metadata: item.metadata as Prisma.InputJsonValue | undefined,
          })),
        });
      }

      if (dto.photos?.length) {
        await tx.assessmentPhoto.createMany({
          data: dto.photos.map((photo) => ({
            assessmentId: created.id,
            mediaAssetId: photo.mediaAssetId,
            position: photo.position,
            consentAcceptedAt: new Date(photo.consentAcceptedAt ?? new Date().toISOString()),
          })),
        });
      }

      if (dto.report) {
        await tx.assessmentReport.create({
          data: {
            assessmentId: created.id,
            ...dto.report,
            generatedAt: new Date(),
          },
        });
      }

      return tx.physicalAssessment.findUniqueOrThrow({
        where: { id: created.id },
        include: assessmentInclude,
      });
    });
  }

  async update(user: JwtUser, id: string, dto: UpdateAssessmentDto) {
    const assessment = await this.prisma.physicalAssessment.findUnique({
      where: { id },
      include: { vitals: true },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    this.assertCanManageAssessment(user, assessment);
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ConflictException('Only draft assessments can be updated');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.physicalAssessment.updateMany({
        where: {
          id,
          ...(dto.version ? { version: dto.version } : {}),
          status: AssessmentStatus.DRAFT,
        },
        data: {
          assessmentDate: dto.assessmentDate ? new Date(dto.assessmentDate) : undefined,
          assessmentType: dto.assessmentType,
          notes: dto.notes,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Assessment was updated by another process');
      }

      if (dto.screening) {
        await tx.assessmentScreening.upsert({
          where: { assessmentId: id },
          create: { assessmentId: id, ...this.mapScreening(dto.screening) },
          update: this.mapScreening(dto.screening),
        });
      }

      if (dto.anamnesis) {
        await tx.assessmentAnamnesis.upsert({
          where: { assessmentId: id },
          create: { assessmentId: id, ...this.mapAnamnesis(dto.anamnesis) },
          update: this.mapAnamnesis(dto.anamnesis),
        });
      }

      if (dto.vitals) {
        await tx.assessmentVitals.upsert({
          where: { assessmentId: id },
          create: {
            assessmentId: id,
            ...dto.vitals,
            bmi: this.calculateBmi(dto.vitals.weightKg, dto.vitals.heightCm),
          },
          update: {
            ...dto.vitals,
            bmi: this.calculateBmi(dto.vitals.weightKg, dto.vitals.heightCm),
          },
        });
      }

      if (dto.circumferences) {
        await tx.assessmentCircumference.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentCircumference.createMany({
          data: dto.circumferences.map((item) => ({
            assessmentId: id,
            kind: item.kind,
            valueCm: item.valueCm,
            side: item.side ?? 'NONE',
            protocol: item.protocol,
            order: item.order,
          })),
        });
      }

      if (dto.skinfolds) {
        await tx.assessmentSkinfold.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentSkinfold.createMany({
          data: dto.skinfolds.map((item) => ({
            assessmentId: id,
            kind: item.kind,
            valueMm: item.valueMm,
            side: item.side ?? 'NONE',
            measurementIndex: item.measurementIndex ?? 1,
            protocol: item.protocol,
          })),
        });
      }

      if (dto.bodyComposition) {
        await tx.assessmentBodyComposition.upsert({
          where: { assessmentId: id },
          create: { assessmentId: id, ...dto.bodyComposition },
          update: dto.bodyComposition,
        });
      }

      if (dto.fitnessTests) {
        await tx.assessmentFitnessTest.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentFitnessTest.createMany({
          data: dto.fitnessTests.map((item) => ({
            assessmentId: id,
            category: item.category,
            testCode: item.testCode,
            name: item.name,
            rawValue: item.rawValue,
            unit: item.unit,
            score: item.score,
            notes: item.notes,
            metadata: item.metadata as Prisma.InputJsonValue | undefined,
          })),
        });
      }

      if (dto.photos) {
        await tx.assessmentPhoto.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentPhoto.createMany({
          data: dto.photos.map((photo) => ({
            assessmentId: id,
            mediaAssetId: photo.mediaAssetId,
            position: photo.position,
            consentAcceptedAt: new Date(photo.consentAcceptedAt ?? new Date().toISOString()),
          })),
        });
      }

      if (dto.report) {
        await tx.assessmentReport.upsert({
          where: { assessmentId: id },
          create: { assessmentId: id, ...dto.report, generatedAt: new Date() },
          update: { ...dto.report, generatedAt: new Date() },
        });
      }

      return tx.physicalAssessment.findUniqueOrThrow({
        where: { id },
        include: assessmentInclude,
      });
    });
  }

  async complete(user: JwtUser, id: string, dto: CompleteAssessmentDto) {
    const assessment = await this.prisma.physicalAssessment.findUnique({
      where: { id },
      include: { vitals: true },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    this.assertCanManageAssessment(user, assessment);
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ConflictException('Only draft assessments can be completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.physicalAssessment.updateMany({
        where: {
          id,
          ...(dto.version ? { version: dto.version } : {}),
          status: AssessmentStatus.DRAFT,
        },
        data: {
          status: AssessmentStatus.COMPLETED,
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Assessment was updated by another process');
      }

      if (assessment.vitals?.heightCm || assessment.vitals?.weightKg) {
        await tx.studentProfile.upsert({
          where: { userId: assessment.studentId },
          create: {
            userId: assessment.studentId,
            currentHeightCm: assessment.vitals?.heightCm ?? undefined,
            currentWeightKg: assessment.vitals?.weightKg ?? undefined,
          },
          update: {
            currentHeightCm: assessment.vitals?.heightCm ?? undefined,
            currentWeightKg: assessment.vitals?.weightKg ?? undefined,
          },
        });
      }

      return tx.physicalAssessment.findUniqueOrThrow({
        where: { id },
        include: assessmentInclude,
      });
    });
  }

  async findOne(user: JwtUser, id: string) {
    const assessment = await this.prisma.physicalAssessment.findUnique({
      where: { id },
      include: assessmentInclude,
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    await this.assertCanReadAssessment(user, assessment);
    return assessment;
  }

  async listForStudent(user: JwtUser, studentId: string, query: ListStudentAssessmentsDto) {
    await this.assertStudentReadable(user, studentId);

    const where = {
      studentId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assessmentType ? { assessmentType: query.assessmentType } : {}),
    };
    const total = await this.prisma.physicalAssessment.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.physicalAssessment.findMany({
      where,
      skip,
      take,
      include: assessmentInclude,
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return paginated(items, meta);
  }

  async progress(user: JwtUser, studentId: string) {
    await this.assertStudentReadable(user, studentId);

    const assessments = await this.prisma.physicalAssessment.findMany({
      where: {
        studentId,
        status: AssessmentStatus.COMPLETED,
      },
      include: {
        vitals: true,
        bodyComposition: true,
        circumferences: {
          where: { kind: 'WAIST' },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
      take: 2,
    });

    const [latest, previous] = assessments;
    return {
      latest,
      previous,
      deltas: latest
        ? {
            weightKg: this.delta(latest.vitals?.weightKg, previous?.vitals?.weightKg),
            bodyFatPercent: this.delta(
              latest.bodyComposition?.bodyFatPercent,
              previous?.bodyComposition?.bodyFatPercent,
            ),
            waistCm: this.delta(
              latest.circumferences[0]?.valueCm,
              previous?.circumferences[0]?.valueCm,
            ),
          }
        : null,
    };
  }

  private async resolveTrainerId(user: JwtUser, studentId: string, trainerId?: string) {
    if (user.role === UserRole.ADMIN) {
      if (!trainerId) {
        throw new NotFoundException('trainerId is required for admin-created assessments');
      }

      await this.ensureTrainer(trainerId);
      await this.ensureStudent(studentId);
      return trainerId;
    }

    if (user.role !== UserRole.TRAINER) {
      throw new ForbiddenException('Only trainers or admins can create assessments');
    }

    await this.ensureStudentBelongsToTrainer(studentId, user.id);
    return user.id;
  }

  private assertCanManageAssessment(user: JwtUser, assessment: Pick<PhysicalAssessment, 'trainerId'>) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role !== UserRole.TRAINER || assessment.trainerId !== user.id) {
      throw new ForbiddenException('Only the owner trainer can manage this assessment');
    }
  }

  private async assertCanReadAssessment(user: JwtUser, assessment: PhysicalAssessment) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.STUDENT && assessment.studentId === user.id) {
      return;
    }

    if (user.role === UserRole.TRAINER && assessment.trainerId === user.id) {
      return;
    }

    throw new ForbiddenException('You do not have access to this assessment');
  }

  private async assertStudentReadable(user: JwtUser, studentId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.STUDENT) {
      if (studentId !== user.id) {
        throw new ForbiddenException('Students can only access their own assessments');
      }
      return;
    }

    if (user.role === UserRole.TRAINER) {
      await this.ensureStudentBelongsToTrainer(studentId, user.id);
      return;
    }

    throw new ForbiddenException('You do not have access to this student');
  }

  private async ensureTrainer(trainerId: string) {
    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId, role: UserRole.TRAINER, deletedAt: null },
      select: { id: true },
    });
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
  }

  private async ensureStudent(studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: UserRole.STUDENT, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async ensureStudentBelongsToTrainer(studentId: string, trainerId: string) {
    await this.ensureStudent(studentId);

    const relationship = await this.prisma.trainerStudent.findFirst({
      where: {
        trainerId,
        studentId,
        status: TrainerStudentStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!relationship) {
      throw new ForbiddenException('Student does not belong to this trainer');
    }
  }

  private calculateBmi(weightKg?: number, heightCm?: number) {
    if (!weightKg || !heightCm) {
      return undefined;
    }

    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(2));
  }

  private delta(current?: Prisma.Decimal | number | null, previous?: Prisma.Decimal | number | null) {
    if (current == null || previous == null) {
      return null;
    }

    return Number(current) - Number(previous);
  }

  private mapScreening(
    screening: CreateAssessmentDto['screening'],
  ): Prisma.AssessmentScreeningUncheckedCreateWithoutAssessmentInput {
    return {
      symptoms: screening?.symptoms,
      knownConditions: screening?.knownConditions,
      medications: screening?.medications,
      clearance: screening?.clearance,
      riskFlags: screening?.riskFlags ?? [],
      restrictions: screening?.restrictions,
      observations: screening?.observations,
    };
  }

  private mapAnamnesis(
    anamnesis: CreateAssessmentDto['anamnesis'],
  ): Prisma.AssessmentAnamnesisUncheckedCreateWithoutAssessmentInput {
    return {
      objectivePrimary: anamnesis?.objectivePrimary,
      objectiveSecondary: anamnesis?.objectiveSecondary,
      activityLevel: anamnesis?.activityLevel,
      sleepQuality: anamnesis?.sleepQuality,
      stressLevel: anamnesis?.stressLevel,
      familyHistory: anamnesis?.familyHistory,
      injuriesHistory: anamnesis?.injuriesHistory,
      limitations: anamnesis?.limitations,
      observations: anamnesis?.observations,
    };
  }
}
