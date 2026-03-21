import { ConflictException, Injectable } from '@nestjs/common';
import { userProfileInclude } from '../common/utils/prisma-selects';
import { sanitizeUser } from '../common/utils/serialization.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: userProfileInclude,
    });
    return sanitizeUser(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (dto.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: { username: dto.username.toLowerCase(), id: { not: userId }, deletedAt: null },
        select: { id: true },
      });
      if (existingUser) {
        throw new ConflictException('Username already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        username: dto.username?.toLowerCase(),
      },
      include: userProfileInclude,
    });

    return sanitizeUser(user);
  }
}
