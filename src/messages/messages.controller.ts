import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { ListDirectMessagesDto } from './dto/list-direct-messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateDirectMessageDto) {
    return this.messagesService.create(user, dto);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: JwtUser, @Query() query: ListDirectMessagesDto) {
    return this.messagesService.inbox(user, query);
  }

  @Get('sent')
  sent(@CurrentUser() user: JwtUser, @Query() query: ListDirectMessagesDto) {
    return this.messagesService.sent(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.messagesService.findOne(user, id);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.messagesService.read(user, id);
  }
}
