import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CreateWorkoutDayDto } from './dto/create-workout-day.dto';
import { UpdateWorkoutDayDto } from './dto/update-workout-day.dto';
import { WorkoutDaysService } from './workout-days.service';

@ApiTags('workout-days')
@ApiBearerAuth()
@Roles('TRAINER', 'ADMIN')
@Controller()
export class WorkoutDaysController {
  constructor(private readonly workoutDaysService: WorkoutDaysService) {}

  @Post('workout-plans/:planId/days')
  create(
    @CurrentUser() user: JwtUser,
    @Param('planId') planId: string,
    @Body() dto: CreateWorkoutDayDto,
  ) {
    return this.workoutDaysService.create(user, planId, dto);
  }

  @Patch('workout-days/:id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateWorkoutDayDto) {
    return this.workoutDaysService.update(user, id, dto);
  }

  @Delete('workout-days/:id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.workoutDaysService.remove(user, id);
  }
}
