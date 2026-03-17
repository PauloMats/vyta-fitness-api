import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { FeedService } from './feed.service';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post('posts')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePostDto) {
    return this.feedService.create(user, dto);
  }

  @Get('posts')
  list(@CurrentUser() user: JwtUser, @Query() query: ListPostsDto) {
    return this.feedService.list(user, query);
  }

  @Get('posts/:id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.feedService.findOne(user, id);
  }

  @Delete('posts/:id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.feedService.remove(user, id);
  }
}
