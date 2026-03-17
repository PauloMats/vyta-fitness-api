import { Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { LikesService } from './likes.service';

@ApiTags('likes')
@ApiBearerAuth()
@Controller('feed/posts')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId/likes')
  create(@CurrentUser() user: JwtUser, @Param('postId') postId: string) {
    return this.likesService.create(user, postId);
  }

  @Delete(':postId/likes')
  remove(@CurrentUser() user: JwtUser, @Param('postId') postId: string) {
    return this.likesService.remove(user, postId);
  }
}
