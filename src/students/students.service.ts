import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { sanitizeUser } from '../common/utils/serialization.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        studentProfile: true,
        studentRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            trainer: {
              select: {
                id: true,
                fullName: true,
                username: true,
                avatarUrl: true,
                trainerProfile: true,
              },
            },
          },
        },
      },
    });

    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students have student profiles');
    }

    return sanitizeUser(user);
  }

  async update(userId: string, dto: UpdateStudentProfileDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });

    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can update this profile');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        bio: dto.bio,
        studentProfile: {
          upsert: {
            create: {
              currentHeightCm: dto.currentHeightCm,
              currentWeightKg: dto.currentWeightKg,
              targetWeightKg: dto.targetWeightKg,
              limitations: dto.limitations,
            },
            update: {
              currentHeightCm: dto.currentHeightCm,
              currentWeightKg: dto.currentWeightKg,
              targetWeightKg: dto.targetWeightKg,
              limitations: dto.limitations,
            },
          },
        },
      },
      include: { studentProfile: true },
    });

    return sanitizeUser(updated);
  }
}
