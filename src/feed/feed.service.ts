import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostVisibility, UserRole, WorkoutSessionStatus, type Post } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { buildPagination, paginated } from '../common/utils/pagination.util';
import { postInclude } from '../common/utils/prisma-selects';
import { serializePost } from '../common/utils/serialization.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: JwtUser, dto: CreatePostDto) {
    if (dto.workoutSessionId) {
      const session = await this.prisma.workoutSession.findUnique({
        where: { id: dto.workoutSessionId },
        select: { id: true, userId: true, status: true },
      });
      if (!session || session.userId !== user.id || session.status !== WorkoutSessionStatus.COMPLETED) {
        throw new ConflictException('Feed posts can only reference completed sessions from the current user');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        userId: user.id,
        workoutSessionId: dto.workoutSessionId,
        mediaUrl: dto.mediaUrl,
        thumbUrl: dto.thumbUrl,
        mediaKind: dto.mediaKind,
        caption: dto.caption,
        visibility: dto.visibility ?? PostVisibility.FRIENDS,
      },
      include: postInclude,
    });

    return serializePost(post, user.id);
  }

  async list(user: JwtUser, query: ListPostsDto) {
    const acceptedFriendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const friendIds = acceptedFriendships.map((friendship) =>
      friendship.requesterId === user.id ? friendship.addresseeId : friendship.requesterId,
    );

    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      OR: [
        { userId: user.id },
        { visibility: PostVisibility.PUBLIC },
        ...(friendIds.length ? [{ userId: { in: friendIds }, visibility: PostVisibility.FRIENDS }] : []),
      ],
    };

    const total = await this.prisma.post.count({ where });
    const { skip, take, meta } = buildPagination(query, total);
    const posts = await this.prisma.post.findMany({
      where,
      skip,
      take,
      include: postInclude,
      orderBy: { createdAt: 'desc' },
    });

    return paginated(
      posts.map((post) => serializePost(post, user.id)),
      meta,
    );
  }

  async findOne(user: JwtUser, id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: postInclude,
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertCanAccessPost(user, post);
    return serializePost(post, user.id);
  }

  async remove(user: JwtUser, id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (user.role !== UserRole.ADMIN && post.userId !== user.id) {
      throw new ForbiddenException('Only the owner can delete this post');
    }
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Post deleted successfully' };
  }

  async assertCanAccessPost(user: JwtUser, post: Post) {
    if (user.role === UserRole.ADMIN || post.userId === user.id || post.visibility === PostVisibility.PUBLIC) {
      return;
    }

    if (post.visibility === PostVisibility.FRIENDS) {
      const friendship = await this.prisma.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: user.id, addresseeId: post.userId },
            { requesterId: post.userId, addresseeId: user.id },
          ],
        },
      });
      if (friendship) {
        return;
      }
    }

    throw new ForbiddenException('You cannot access this post');
  }
}
