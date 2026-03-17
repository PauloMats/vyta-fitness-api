import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { sanitizeUser } from '../common/utils/serialization.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListTrainersDto } from './dto/list-trainers.dto';

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTrainersDto) {
    const where = {
      role: UserRole.TRAINER,
      status: UserStatus.ACTIVE,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { username: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.specialty
        ? {
            trainerProfile: {
              specialties: {
                has: query.specialty,
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.user.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const trainers = await this.prisma.user.findMany({
      where,
      skip,
      take,
      include: { trainerProfile: true },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(
      trainers.map((trainer) => sanitizeUser(trainer)),
      meta,
    );
  }

  async findOne(id: string) {
    const trainer = await this.prisma.user.findFirstOrThrow({
      where: { id, role: UserRole.TRAINER },
      include: {
        trainerProfile: true,
        trainerWorkoutPlans: {
          where: { isTemplate: true },
          select: { id: true, title: true, visibility: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return sanitizeUser(trainer);
  }
}
