import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreateWorkoutSetDto } from './dto/create-workout-set.dto';
import { FinishWorkoutSessionDto } from './dto/finish-workout-session.dto';
import { ListWorkoutSessionsDto } from './dto/list-workout-sessions.dto';
import { StartWorkoutSessionDto } from './dto/start-workout-session.dto';
import { WorkoutSessionsService } from './workout-sessions.service';

@ApiTags('workout-sessions')
@ApiBearerAuth()
@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly workoutSessionsService: WorkoutSessionsService) {}

  @Post('start')
  start(@CurrentUser() user: JwtUser, @Body() dto: StartWorkoutSessionDto) {
    return this.workoutSessionsService.start(user, dto);
  }

  @Post(':id/sets')
  addSet(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: CreateWorkoutSetDto) {
    return this.workoutSessionsService.addSet(user, id, dto);
  }

  @Patch(':id/finish')
  finish(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: FinishWorkoutSessionDto) {
    return this.workoutSessionsService.finish(user, id, dto);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: FinishWorkoutSessionDto) {
    return this.workoutSessionsService.cancel(user, id, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: JwtUser, @Query() query: ListWorkoutSessionsDto) {
    return this.workoutSessionsService.listMine(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.workoutSessionsService.findOne(user, id);
  }
}
