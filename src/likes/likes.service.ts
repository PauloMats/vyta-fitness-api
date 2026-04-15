import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { FeedService } from '../feed/feed.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedService: FeedService,
  ) {}

  async create(user: JwtUser, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.feedService.assertCanAccessPost(user, post);

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Like already exists');
    }

    const like = await this.prisma.postLike.create({
      data: { postId, userId: user.id },
    });

    if (post.userId !== user.id) {
      await this.prisma.notification.create({
        data: {
          recipientId: post.userId,
          senderId: user.id,
          type: NotificationType.POST_LIKE,
          title: 'Novo like no post',
          body: 'Seu post recebeu um novo like.',
          meta: { postId },
        },
      });
    }

    return like;
  }

  async remove(user: JwtUser, postId: string) {
    const like = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });
    if (!like) {
      throw new NotFoundException('Like not found');
    }
    await this.prisma.postLike.delete({ where: { id: like.id } });
    return { message: 'Like removed successfully' };
  }
}
