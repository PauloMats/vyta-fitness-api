import { Module } from '@nestjs/common';
import { WorkoutPlansModule } from '../workout-plans/workout-plans.module';
import { WorkoutDaysController } from './workout-days.controller';
import { WorkoutDaysService } from './workout-days.service';

@Module({
  imports: [WorkoutPlansModule],
  controllers: [WorkoutDaysController],
  providers: [WorkoutDaysService],
})
export class WorkoutDaysModule {}
