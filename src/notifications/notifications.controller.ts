import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles('ADMIN', 'TRAINER')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListNotificationsDto) {
    return this.notificationsService.list(user, query);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.notificationsService.read(user, id);
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: JwtUser) {
    return this.notificationsService.readAll(user);
  }
}
