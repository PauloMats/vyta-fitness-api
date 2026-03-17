import { ConflictException, Injectable } from '@nestjs/common';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseLibraryDto } from './dto/create-exercise-library.dto';
import { ListExerciseLibraryDto } from './dto/list-exercise-library.dto';

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
      data: {
        name: dto.name,
        slug,
        muscleGroup: dto.muscleGroup,
        equipment: dto.equipment,
        instructions: dto.instructions,
        defaultMediaUrl: dto.defaultMediaUrl,
        defaultThumbUrl: dto.defaultThumbUrl,
      },
    });
  }

  async list(query: ListExerciseLibraryDto) {
    const where = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.muscleGroup ? { muscleGroup: query.muscleGroup } : {}),
      ...(query.equipment ? { equipment: query.equipment } : {}),
    };

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

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
