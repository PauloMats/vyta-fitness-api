import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { FriendshipsService } from './friendships.service';
import { ListFriendshipsDto } from './dto/list-friendships.dto';
import { RequestFriendshipDto } from './dto/request-friendship.dto';
import { UpdateFriendshipStatusDto } from './dto/update-friendship-status.dto';

@ApiTags('friendships')
@ApiBearerAuth()
@Controller('friendships')
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Post('request')
  request(@CurrentUser() user: JwtUser, @Body() dto: RequestFriendshipDto) {
    return this.friendshipsService.request(user, dto);
  }

  @Patch(':id/status')
  updateStatus(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateFriendshipStatusDto) {
    return this.friendshipsService.updateStatus(user, id, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListFriendshipsDto) {
    return this.friendshipsService.list(user, query);
  }
}
