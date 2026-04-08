import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { importExerciseCatalog } from './exercise-catalog.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseLibraryDto } from './dto/create-exercise-library.dto';
import { ExerciseAutocompleteQueryDto } from './dto/exercise-autocomplete-query.dto';
import { ImportExerciseCatalogDto } from './dto/import-exercise-catalog.dto';
import { ListExerciseLibraryDto } from './dto/list-exercise-library.dto';
import { UpdateExerciseLibraryDto } from './dto/update-exercise-library.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExerciseLibraryDto) {
    const slug = dto.slug ?? this.slugify(dto.name);
    const existing = await this.prisma.exerciseLibrary.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Exercise slug already exists');
    }

    return this.prisma.exerciseLibrary.create({
      data: this.buildCreateData(dto, slug),
    });
  }

  async update(id: string, dto: UpdateExerciseLibraryDto) {
    const current = await this.prisma.exerciseLibrary.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Exercise not found');
    }

    const slug = dto.slug ?? (dto.name ? this.slugify(dto.name) : current.slug);
    if (slug !== current.slug) {
      const existing = await this.prisma.exerciseLibrary.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Exercise slug already exists');
      }
    }

    const merged = {
      name: dto.name ?? current.name,
      originalName: dto.originalName ?? current.originalName ?? undefined,
      slug,
      description: dto.description ?? current.description ?? undefined,
      category: dto.category ?? current.category,
      movementPattern: dto.movementPattern ?? current.movementPattern,
      mechanic: dto.mechanic ?? current.mechanic,
      forceType: dto.forceType ?? current.forceType,
      difficulty: dto.difficulty ?? current.difficulty,
      bodyRegion: dto.bodyRegion ?? current.bodyRegion,
      isUnilateral: dto.isUnilateral ?? current.isUnilateral,
      isActive: dto.isActive ?? current.isActive,
      muscleGroup: dto.muscleGroup ?? current.muscleGroup,
      equipment: dto.equipment ?? current.equipment ?? undefined,
      instructions: dto.instructions ?? current.instructions,
      defaultMediaUrl: dto.defaultMediaUrl ?? current.defaultMediaUrl ?? undefined,
      defaultThumbUrl: dto.defaultThumbUrl ?? current.defaultThumbUrl ?? undefined,
      aliases: dto.aliases ?? current.aliases,
      primaryMuscles: dto.primaryMuscles ?? current.primaryMuscles,
      secondaryMuscles: dto.secondaryMuscles ?? current.secondaryMuscles,
      equipmentList: dto.equipmentList ?? current.equipmentList,
      instructionSteps: dto.instructionSteps ?? current.instructionSteps,
      instructionsPtBrAuto: dto.instructionsPtBrAuto ?? current.instructionsPtBrAuto,
      tips: dto.tips ?? current.tips,
      contraindications: dto.contraindications ?? current.contraindications,
      tags: dto.tags ?? current.tags,
      imageUrls: dto.imageUrls ?? current.imageUrls,
      videoUrl: dto.videoUrl ?? current.videoUrl ?? undefined,
      sourceProvider: dto.sourceProvider ?? current.sourceProvider ?? undefined,
      sourceExternalId: dto.sourceExternalId ?? current.sourceExternalId ?? undefined,
      sourceLicense: dto.sourceLicense ?? current.sourceLicense ?? undefined,
    } satisfies CreateExerciseLibraryDto;

    const result = await this.prisma.exerciseLibrary.updateMany({
      where: {
        id,
        ...(dto.version ? { version: dto.version } : {}),
      },
      data: {
        ...this.buildCreateData(merged, slug),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Exercise was updated by another process');
    }

    return this.prisma.exerciseLibrary.findUniqueOrThrow({ where: { id } });
  }

  async list(query: ListExerciseLibraryDto) {
    const where = this.buildWhere(query);

    const total = await this.prisma.exerciseLibrary.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const items = await this.prisma.exerciseLibrary.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return paginated(items, meta);
  }

  async findOne(id: string) {
    return this.prisma.exerciseLibrary.findUniqueOrThrow({ where: { id } });
  }

  async autocomplete(query: ExerciseAutocompleteQueryDto) {
    const items = await this.prisma.exerciseLibrary.findMany({
      where: {
        isActive: true,
        ...(query.category ? { category: query.category } : {}),
        ...(query.bodyRegion ? { bodyRegion: query.bodyRegion } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { originalName: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: query.limit,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        originalName: true,
        category: true,
        bodyRegion: true,
        difficulty: true,
        primaryMuscles: true,
        defaultThumbUrl: true,
      },
    });

    return items;
  }

  async filtersMeta() {
    const items = await this.prisma.exerciseLibrary.findMany({
      where: { isActive: true },
      select: {
        category: true,
        bodyRegion: true,
        difficulty: true,
        movementPattern: true,
        mechanic: true,
        forceType: true,
        muscleGroup: true,
        primaryMuscles: true,
        secondaryMuscles: true,
        equipmentList: true,
        tags: true,
      },
    });

    return {
      categories: this.uniqueSorted(items.map((item) => item.category)),
      bodyRegions: this.uniqueSorted(items.map((item) => item.bodyRegion)),
      difficulties: this.uniqueSorted(items.map((item) => item.difficulty)),
      movementPatterns: this.uniqueSorted(items.map((item) => item.movementPattern)),
      mechanics: this.uniqueSorted(items.map((item) => item.mechanic)),
      forceTypes: this.uniqueSorted(items.map((item) => item.forceType)),
      muscleGroups: this.uniqueSorted(items.map((item) => item.muscleGroup)),
      primaryMuscles: this.uniqueSorted(items.flatMap((item) => item.primaryMuscles)),
      secondaryMuscles: this.uniqueSorted(items.flatMap((item) => item.secondaryMuscles)),
      equipment: this.uniqueSorted(items.flatMap((item) => item.equipmentList)),
      tags: this.uniqueSorted(items.flatMap((item) => item.tags)),
    };
  }

  async importCatalog(dto: ImportExerciseCatalogDto) {
    const result = await importExerciseCatalog(this.prisma, {
      clearExisting: dto.clearExisting,
      strict: true,
    });

    return {
      imported: result?.count ?? 0,
      filePath: result?.filePath,
    };
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private joinList(values?: string[]) {
    if (!values?.length) {
      return undefined;
    }

    return values.join(', ');
  }

  private joinInstructions(values?: string[]) {
    if (!values?.length) {
      return undefined;
    }

    return values.map((value, index) => `${index + 1}. ${value}`).join('\n');
  }

  private buildCreateData(dto: CreateExerciseLibraryDto, slug: string): Prisma.ExerciseLibraryUncheckedCreateInput {
    return {
      name: dto.name,
      originalName: dto.originalName,
      slug,
      description: dto.description,
      category: dto.category,
      movementPattern: dto.movementPattern,
      mechanic: dto.mechanic,
      forceType: dto.forceType,
      difficulty: dto.difficulty,
      bodyRegion: dto.bodyRegion,
      isUnilateral: dto.isUnilateral,
      isActive: dto.isActive,
      muscleGroup: dto.muscleGroup ?? dto.primaryMuscles?.[0] ?? dto.bodyRegion ?? 'OTHER',
      equipment: dto.equipment ?? this.joinList(dto.equipmentList),
      instructions:
        dto.instructions ??
        this.joinInstructions(dto.instructionsPtBrAuto) ??
        this.joinInstructions(dto.instructionSteps) ??
        'Sem instrucoes detalhadas.',
      defaultMediaUrl: dto.defaultMediaUrl ?? dto.videoUrl ?? dto.imageUrls?.[0] ?? dto.defaultThumbUrl,
      defaultThumbUrl: dto.defaultThumbUrl,
      aliases: dto.aliases ?? [],
      primaryMuscles: dto.primaryMuscles ?? [],
      secondaryMuscles: dto.secondaryMuscles ?? [],
      equipmentList: dto.equipmentList ?? [],
      instructionSteps: dto.instructionSteps ?? [],
      instructionsPtBrAuto: dto.instructionsPtBrAuto ?? [],
      tips: dto.tips ?? [],
      contraindications: dto.contraindications ?? [],
      tags: dto.tags ?? [],
      imageUrls: dto.imageUrls ?? [],
      videoUrl: dto.videoUrl,
      sourceProvider: dto.sourceProvider,
      sourceExternalId: dto.sourceExternalId,
      sourceLicense: dto.sourceLicense,
    };
  }

  private buildWhere(query: ListExerciseLibraryDto): Prisma.ExerciseLibraryWhereInput {
    return {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { originalName: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.muscleGroup ? { muscleGroup: query.muscleGroup } : {}),
      ...(query.equipment ? { equipment: query.equipment } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.bodyRegion ? { bodyRegion: query.bodyRegion } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.movementPattern ? { movementPattern: query.movementPattern } : {}),
      ...(query.mechanic ? { mechanic: query.mechanic } : {}),
      ...(query.forceType ? { forceType: query.forceType } : {}),
      ...(query.primaryMuscle ? { primaryMuscles: { has: query.primaryMuscle } } : {}),
      ...(query.secondaryMuscle ? { secondaryMuscles: { has: query.secondaryMuscle } } : {}),
      ...(query.equipmentItem ? { equipmentList: { has: query.equipmentItem } } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };
  }

  private uniqueSorted(values: string[]) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }
}
