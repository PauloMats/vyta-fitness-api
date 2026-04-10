import {
  AssessmentStatus,
  AssessmentType,
  Prisma,
  StudentImportMatchStatus,
  StudentImportSourcePlatform,
  StudentImportStatus,
  TrainerStudentStatus,
  UserRole,
  UserStatus,
  WorkoutPlanVisibility,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmStudentImportDto } from './dto/confirm-student-import.dto';
import { ListStudentImportsDto } from './dto/list-student-imports.dto';
import { UpdateStudentImportMappingDto } from './dto/update-student-import-mapping.dto';
import { StudentImportsParserService } from './student-imports-parser.service';
import {
  StudentImportMappingSummary,
  StudentImportParsedData,
  StudentImportPreview,
} from './student-imports.types';

const importInclude = {
  issues: {
    orderBy: [{ severity: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  exerciseMatches: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.StudentImportJobInclude;

@Injectable()
export class StudentImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: StudentImportsParserService,
  ) {}

  async createFromPdf(user: JwtUser, file: { buffer: Buffer; filename: string }, sourcePlatform?: string) {
    const requestedSource = this.parseSourcePlatform(sourcePlatform);

    const job = await this.prisma.studentImportJob.create({
      data: {
        createdByUserId: user.id,
        fileName: file.filename,
        sourcePlatform: requestedSource ?? StudentImportSourcePlatform.UNKNOWN,
        status: StudentImportStatus.PROCESSING,
      },
    });

    try {
      const parsed = await this.parser.parse(file.buffer, file.filename, requestedSource);
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.studentImportJob.update({
          where: { id: job.id },
          data: {
            sourcePlatform: parsed.sourcePlatform,
            status: StudentImportStatus.REVIEW_READY,
            rawExtractedText: parsed.rawExtractedText,
            parsedData: parsed.parsedData as Prisma.InputJsonValue,
            mappingSummary: parsed.mappingSummary as Prisma.InputJsonValue,
            errorMessage: null,
          },
        });

        if (parsed.mappingSummary.issues.length) {
          await tx.studentImportIssue.createMany({
            data: parsed.mappingSummary.issues.map((issue) => ({
              importJobId: job.id,
              fieldPath: issue.fieldPath,
              severity: issue.severity,
              message: issue.message,
              suggestedValue: issue.suggestedValue as Prisma.InputJsonValue | undefined,
            })),
          });
        }

        if (parsed.exerciseMatches.length) {
          await tx.studentImportExerciseMatch.createMany({
            data: parsed.exerciseMatches.map((match) => ({
              importJobId: job.id,
              rawExerciseName: match.rawExerciseName,
              normalizedExerciseName: this.normalize(match.rawExerciseName),
              matchedExerciseLibraryId: match.matchedExerciseLibraryId,
              matchedExerciseName: match.matchedExerciseName,
              confidence: match.confidence,
              status: match.status as StudentImportMatchStatus,
              payload: {
                sets: match.sets,
                reps: match.reps,
                restSeconds: match.restSeconds,
                notes: match.notes,
              } as Prisma.InputJsonValue,
            })),
          });
        }

        return tx.studentImportJob.findUniqueOrThrow({
          where: { id: job.id },
          include: importInclude,
        });
      });

      return this.toJobResponse(created);
    } catch (error) {
      await this.prisma.studentImportJob.update({
        where: { id: job.id },
        data: {
          status: StudentImportStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown import error',
        },
      });
      throw error;
    }
  }

  async list(user: JwtUser, query: ListStudentImportsDto) {
    const where: Prisma.StudentImportJobWhereInput = {
      ...(user.role === UserRole.ADMIN ? {} : { createdByUserId: user.id }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourcePlatform ? { sourcePlatform: query.sourcePlatform } : {}),
    };

    const total = await this.prisma.studentImportJob.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.studentImportJob.findMany({
      where,
      skip,
      take,
      include: importInclude,
      orderBy: { createdAt: 'desc' },
    });

    return paginated(items.map((item) => this.toJobResponse(item)), meta);
  }

  async findOne(user: JwtUser, id: string) {
    const job = await this.prisma.studentImportJob.findUnique({
      where: { id },
      include: importInclude,
    });
    if (!job) {
      throw new NotFoundException('Student import not found');
    }

    this.assertCanAccessJob(user, job.createdByUserId);
    return this.toJobResponse(job);
  }

  async preview(user: JwtUser, id: string) {
    const job = await this.prisma.studentImportJob.findUnique({
      where: { id },
      include: importInclude,
    });
    if (!job) {
      throw new NotFoundException('Student import not found');
    }

    this.assertCanAccessJob(user, job.createdByUserId);
    return this.toPreview(job);
  }

  async updateMapping(user: JwtUser, id: string, dto: UpdateStudentImportMappingDto) {
    const job = await this.prisma.studentImportJob.findUnique({
      where: { id },
      include: importInclude,
    });
    if (!job) {
      throw new NotFoundException('Student import not found');
    }
    this.assertCanAccessJob(user, job.createdByUserId);

    const parsedData = this.parseParsedData(job.parsedData);
    const mappingSummary = this.parseMappingSummary(job.mappingSummary);
    const mergedParsed: StudentImportParsedData = {
      ...parsedData,
      student: dto.student ? { ...parsedData.student, ...dto.student } : parsedData.student,
      assessment: dto.assessment ? { ...parsedData.assessment, ...dto.assessment } : parsedData.assessment,
      workoutPlan: dto.workoutPlan ? { ...parsedData.workoutPlan, ...dto.workoutPlan } : parsedData.workoutPlan,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.studentImportJob.update({
        where: { id },
        data: {
          parsedData: mergedParsed as Prisma.InputJsonValue,
          mappingSummary: mappingSummary as Prisma.InputJsonValue,
        },
      });

      if (dto.exerciseMatches?.length) {
        for (const match of dto.exerciseMatches) {
          const exercise = match.matchedExerciseLibraryId
            ? await tx.exerciseLibrary.findUnique({
                where: { id: match.matchedExerciseLibraryId },
                select: { id: true, name: true },
              })
            : null;

          await tx.studentImportExerciseMatch.updateMany({
            where: {
              importJobId: id,
              rawExerciseName: match.rawExerciseName,
            },
            data: {
              matchedExerciseLibraryId: exercise?.id ?? null,
              matchedExerciseName: exercise?.name ?? null,
              status: exercise ? StudentImportMatchStatus.MANUAL_REVIEW : StudentImportMatchStatus.UNMATCHED,
            },
          });
        }
      }
    });

    return this.preview(user, id);
  }

  async confirm(user: JwtUser, id: string, dto: ConfirmStudentImportDto) {
    const job = await this.prisma.studentImportJob.findUnique({
      where: { id },
      include: importInclude,
    });
    if (!job) {
      throw new NotFoundException('Student import not found');
    }
    this.assertCanAccessJob(user, job.createdByUserId);

    if (job.status !== StudentImportStatus.REVIEW_READY) {
      throw new ConflictException('Only imports ready for review can be confirmed');
    }

    const preview = this.toPreview(job);
    if (preview.summary.unmatchedExercises > 0) {
      throw new ConflictException('Resolve unmatched exercises before confirming the import');
    }

    return this.prisma.$transaction(async (tx) => {
      const trainerId = await this.resolveTrainerId(tx, user, dto);
      const studentId = await this.resolveStudentId(tx, user, job.id, preview, dto);

      let assessmentId: string | null = null;
      if (dto.createAssessment) {
        assessmentId = await this.createAssessmentFromPreview(tx, trainerId, studentId, preview, dto.assessmentStatus);
      }

      let planId: string | null = null;
      if (dto.createWorkoutPlan) {
        planId = await this.createWorkoutPlanFromPreview(tx, trainerId, studentId, preview, dto);
      }

      await tx.studentImportJob.update({
        where: { id },
        data: {
          status: StudentImportStatus.CONFIRMED,
          confirmedStudentId: studentId,
          confirmedAssessmentId: assessmentId,
          confirmedPlanId: planId,
        },
      });

      return {
        studentId,
        assessmentId,
        planId,
        status: StudentImportStatus.CONFIRMED,
      };
    });
  }

  private async resolveTrainerId(tx: Prisma.TransactionClient, user: JwtUser, dto: ConfirmStudentImportDto) {
    if (user.role === UserRole.TRAINER) {
      return user.id;
    }

    if (!dto.createAssessment && !dto.createWorkoutPlan) {
      return dto.trainerId ?? user.id;
    }

    if (!dto.trainerId) {
      throw new BadRequestException('trainerId is required when admin confirms assessment or workout plan');
    }

    const trainer = await tx.user.findUnique({
      where: { id: dto.trainerId },
      select: { id: true, role: true, status: true },
    });
    if (!trainer || trainer.role !== UserRole.TRAINER || trainer.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Trainer not found');
    }

    return trainer.id;
  }

  private async resolveStudentId(
    tx: Prisma.TransactionClient,
    user: JwtUser,
    jobId: string,
    preview: StudentImportPreview,
    dto: ConfirmStudentImportDto,
  ) {
    if (!dto.createStudent && !dto.existingStudentId) {
      throw new BadRequestException('existingStudentId is required when createStudent is false');
    }

    if (dto.existingStudentId) {
      const existing = await tx.user.findUnique({
        where: { id: dto.existingStudentId },
        select: { id: true, role: true },
      });
      if (!existing || existing.role !== UserRole.STUDENT) {
        throw new NotFoundException('Student not found');
      }

      if (user.role === UserRole.TRAINER) {
        const relationship = await tx.trainerStudent.findFirst({
          where: {
            trainerId: user.id,
            studentId: existing.id,
            status: TrainerStudentStatus.ACTIVE,
          },
        });
        if (!relationship) {
          throw new ForbiddenException('Trainer can only import data into active students');
        }
      }

      return existing.id;
    }

    const fullName = preview.student.fullName.value?.trim();
    if (!fullName) {
      throw new BadRequestException('Student fullName is required to create a new student');
    }

    const email = preview.student.email.value?.trim().toLowerCase() ?? `imported-${jobId}@vyta.local`;
    const existingByEmail = await tx.user.findFirst({ where: { email }, select: { id: true } });
    if (existingByEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(randomUUID());
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        phone: preview.student.phone.value ?? undefined,
        bio: preview.student.notes.value ?? undefined,
        studentProfile: {
          create: {
            currentHeightCm: preview.student.currentHeightCm.value ?? undefined,
            currentWeightKg: preview.student.currentWeightKg.value ?? undefined,
            targetWeightKg: preview.student.targetWeightKg.value ?? undefined,
            limitations: preview.student.limitations.value ?? undefined,
          },
        },
      },
      select: { id: true },
    });

    if (user.role === UserRole.TRAINER) {
      await tx.trainerStudent.create({
        data: {
          trainerId: user.id,
          studentId: created.id,
          status: TrainerStudentStatus.ACTIVE,
          startedAt: new Date(),
        },
      });
    }

    return created.id;
  }

  private async createAssessmentFromPreview(
    tx: Prisma.TransactionClient,
    trainerId: string,
    studentId: string,
    preview: StudentImportPreview,
    requestedStatus?: AssessmentStatus,
  ) {
    const created = await tx.physicalAssessment.create({
      data: {
        trainerId,
        studentId,
        assessmentDate: new Date(preview.assessment.assessmentDate.value ?? new Date().toISOString()),
        assessmentType:
          preview.assessment.assessmentType.value === 'INITIAL'
            ? AssessmentType.INITIAL
            : AssessmentType.REASSESSMENT,
        status: requestedStatus === AssessmentStatus.COMPLETED ? AssessmentStatus.COMPLETED : AssessmentStatus.DRAFT,
        completedAt: requestedStatus === AssessmentStatus.COMPLETED ? new Date() : undefined,
        vitals: {
          create: {
            weightKg: preview.assessment.vitals.weightKg.value ?? undefined,
            heightCm: preview.assessment.vitals.heightCm.value ?? undefined,
            bmi: preview.assessment.vitals.bmi.value ?? undefined,
            restingHeartRate: preview.assessment.vitals.restingHeartRate.value ?? undefined,
            systolicBp: preview.assessment.vitals.systolicBp.value ?? undefined,
            diastolicBp: preview.assessment.vitals.diastolicBp.value ?? undefined,
          },
        },
        circumferences: preview.assessment.circumferences.length
          ? {
              createMany: {
                data: preview.assessment.circumferences
                  .filter((item) => item.valueCm !== null)
                  .map((item, index) => ({
                    kind: item.kind as Prisma.AssessmentCircumferenceCreateManyAssessmentInput['kind'],
                    side: item.side,
                    valueCm: item.valueCm!,
                    order: index + 1,
                  })),
              },
            }
          : undefined,
        skinfolds: preview.assessment.skinfolds.length
          ? {
              createMany: {
                data: preview.assessment.skinfolds
                  .filter((item) => item.valueMm !== null)
                  .map((item, index) => ({
                    kind: item.kind as Prisma.AssessmentSkinfoldCreateManyAssessmentInput['kind'],
                    side: item.side,
                    valueMm: item.valueMm!,
                    measurementIndex: index + 1,
                  })),
              },
            }
          : undefined,
        bodyComposition:
          preview.assessment.bodyComposition &&
          (preview.assessment.bodyComposition.bodyFatPercent ||
            preview.assessment.bodyComposition.leanMassKg)
            ? {
                create: {
                  method: 'MANUAL',
                  bodyFatPercent: preview.assessment.bodyComposition.bodyFatPercent ?? undefined,
                  leanMassKg: preview.assessment.bodyComposition.leanMassKg ?? undefined,
                  isComparable: false,
                },
              }
            : undefined,
      },
      select: { id: true },
    });

    if (requestedStatus === AssessmentStatus.COMPLETED) {
      await tx.studentProfile.upsert({
        where: { userId: studentId },
        create: {
          userId: studentId,
          currentHeightCm: preview.assessment.vitals.heightCm.value ?? undefined,
          currentWeightKg: preview.assessment.vitals.weightKg.value ?? undefined,
          targetWeightKg: preview.student.targetWeightKg.value ?? undefined,
          limitations: preview.student.limitations.value ?? undefined,
        },
        update: {
          currentHeightCm: preview.assessment.vitals.heightCm.value ?? undefined,
          currentWeightKg: preview.assessment.vitals.weightKg.value ?? undefined,
          targetWeightKg: preview.student.targetWeightKg.value ?? undefined,
          limitations: preview.student.limitations.value ?? undefined,
        },
      });
    }

    return created.id;
  }

  private async createWorkoutPlanFromPreview(
    tx: Prisma.TransactionClient,
    trainerId: string,
    studentId: string,
    preview: StudentImportPreview,
    dto: ConfirmStudentImportDto,
  ) {
    const plan = await tx.workoutPlan.create({
      data: {
        trainerId,
        studentId,
        title: preview.workoutPlan.title.value ?? 'Treino importado',
        goal: preview.workoutPlan.goal.value ?? 'Importado de outra plataforma',
        visibility: dto.planVisibility ?? WorkoutPlanVisibility.PRIVATE,
        isTemplate: dto.isTemplate ?? false,
        days: {
          create: preview.workoutPlan.days.map((day) => ({
            order: day.order,
            weekDay: day.weekDay && day.weekDay >= 1 ? day.weekDay : 1,
            title: day.title,
            focus: day.focus,
            estimatedMinutes: day.estimatedMinutes ?? 45,
            exercises: {
              create: day.exercises.map((exercise, index) => ({
                order: index + 1,
                exerciseLibraryId: exercise.matchedExerciseLibraryId ?? undefined,
                nameSnapshot: exercise.matchedExerciseName ?? exercise.rawExerciseName,
                muscleGroupSnapshot: null,
                sets: exercise.sets ?? 3,
                reps: exercise.reps ?? '10-12',
                restSeconds: exercise.restSeconds ?? 60,
                notes: exercise.notes ?? undefined,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    return plan.id;
  }

  private parseSourcePlatform(value?: string | null) {
    if (!value) {
      return undefined;
    }

    if (Object.values(StudentImportSourcePlatform).includes(value as StudentImportSourcePlatform)) {
      return value as StudentImportSourcePlatform;
    }

    throw new BadRequestException('Invalid sourcePlatform value');
  }

  private parseParsedData(value: Prisma.JsonValue | null): StudentImportParsedData {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Parsed import data is not available');
    }

    return value as unknown as StudentImportParsedData;
  }

  private parseMappingSummary(value: Prisma.JsonValue | null): StudentImportMappingSummary {
    if (!value || typeof value !== 'object') {
      return {
        issues: [],
        summary: {
          recognizedFields: 0,
          pendingFields: 0,
          autoMatchedExercises: 0,
          manualReviewExercises: 0,
          unmatchedExercises: 0,
        },
      };
    }

    return value as unknown as StudentImportMappingSummary;
  }

  private toPreview(
    job: Prisma.StudentImportJobGetPayload<{
      include: typeof importInclude;
    }>,
  ): StudentImportPreview {
    const parsedData = this.parseParsedData(job.parsedData);
    const mappingSummary = this.parseMappingSummary(job.mappingSummary);
    const storedMatches = new Map(
      job.exerciseMatches.map((match) => [
        this.normalize(match.rawExerciseName),
        {
          rawExerciseName: match.rawExerciseName,
          matchedExerciseLibraryId: match.matchedExerciseLibraryId,
          matchedExerciseName: match.matchedExerciseName,
          confidence: match.confidence ? Number(match.confidence) : 0,
          status: match.status,
          sets: this.readNumber(match.payload, 'sets'),
          reps: this.readString(match.payload, 'reps'),
          restSeconds: this.readNumber(match.payload, 'restSeconds'),
          notes: this.readString(match.payload, 'notes'),
        },
      ]),
    );

    return {
      ...parsedData,
      workoutPlan: {
        ...parsedData.workoutPlan,
        days: parsedData.workoutPlan.days.map((day) => ({
          ...day,
          exercises: day.exercises.map((exercise) => storedMatches.get(this.normalize(exercise.rawExerciseName)) ?? exercise),
        })),
      },
      issues: job.issues.map((issue) => ({
        fieldPath: issue.fieldPath,
        severity: issue.severity,
        message: issue.message,
        suggestedValue: issue.suggestedValue ?? undefined,
      })),
      summary: mappingSummary.summary,
    };
  }

  private toJobResponse(
    job: Prisma.StudentImportJobGetPayload<{
      include: typeof importInclude;
    }>,
  ) {
    return {
      id: job.id,
      sourcePlatform: job.sourcePlatform,
      status: job.status,
      fileName: job.fileName,
      errorMessage: job.errorMessage,
      confirmedStudentId: job.confirmedStudentId,
      confirmedPlanId: job.confirmedPlanId,
      confirmedAssessmentId: job.confirmedAssessmentId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      preview: this.toPreview(job),
    };
  }

  private assertCanAccessJob(user: JwtUser, ownerId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.id !== ownerId) {
      throw new ForbiddenException('You do not have access to this student import');
    }
  }

  private readNumber(value: Prisma.JsonValue | null | undefined, key: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = (value as Record<string, unknown>)[key];
    return typeof raw === 'number' ? raw : null;
  }

  private readString(value: Prisma.JsonValue | null | undefined, key: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = (value as Record<string, unknown>)[key];
    return typeof raw === 'string' ? raw : null;
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
