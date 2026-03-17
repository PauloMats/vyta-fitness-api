import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { ListWorkoutPlansDto } from './dto/list-workout-plans.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { WorkoutPlansService } from './workout-plans.service';

@ApiTags('workout-plans')
@ApiBearerAuth()
@Controller('workout-plans')
export class WorkoutPlansController {
  constructor(private readonly workoutPlansService: WorkoutPlansService) {}

  @Roles('TRAINER', 'ADMIN')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateWorkoutPlanDto) {
    return this.workoutPlansService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListWorkoutPlansDto) {
    return this.workoutPlansService.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.workoutPlansService.findOne(user, id);
  }

  @Roles('TRAINER', 'ADMIN')
  @Patch(':id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateWorkoutPlanDto) {
    return this.workoutPlansService.update(user, id, dto);
  }

  @Roles('TRAINER', 'ADMIN')
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.workoutPlansService.remove(user, id);
  }
}
