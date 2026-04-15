import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Roles('TRAINER', 'ADMIN')
  @Post('tickets')
  createTicket(@CurrentUser() user: JwtUser, @Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicket(user, dto);
  }

  @Roles('TRAINER', 'ADMIN')
  @Get('tickets/me')
  myTickets(@CurrentUser() user: JwtUser, @Query() query: ListSupportTicketsDto) {
    return this.supportService.myTickets(user, query);
  }

  @Roles('TRAINER', 'ADMIN')
  @Get('tickets/:id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.supportService.findOne(user, id);
  }

  @Roles('ADMIN')
  @Patch('tickets/:id/status')
  updateStatus(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateSupportTicketStatusDto) {
    return this.supportService.updateStatus(user, id, dto);
  }
}
