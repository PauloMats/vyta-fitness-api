import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, UserRole } from '@prisma/client';
import type { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { FeedService } from '../feed/feed.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedService: FeedService,
  ) {}

  async create(user: JwtUser, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.feedService.assertCanAccessPost(user, post);

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId: user.id,
        text: dto.text,
      },
      include: {
        user: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    if (post.userId !== user.id) {
      await this.prisma.notification.create({
        data: {
          userId: post.userId,
          type: NotificationType.POST_COMMENT,
          title: 'Novo comentario no post',
          message: 'Seu post recebeu um novo comentario.',
          data: { postId, commentId: comment.id },
        },
      });
    }

    return comment;
  }

  async remove(user: JwtUser, id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (user.role !== UserRole.ADMIN && comment.userId !== user.id) {
      throw new ForbiddenException('Only the owner can delete this comment');
    }
    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted successfully' };
  }
}
