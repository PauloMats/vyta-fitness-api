import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('feed/posts/:postId/comments')
  create(@CurrentUser() user: JwtUser, @Param('postId') postId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(user, postId, dto);
  }

  @Delete('comments/:id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.commentsService.remove(user, id);
  }
}
