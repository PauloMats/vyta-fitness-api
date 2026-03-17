import { Module } from '@nestjs/common';
import { WorkoutPlansModule } from '../workout-plans/workout-plans.module';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { WorkoutSessionsService } from './workout-sessions.service';

@Module({
  imports: [WorkoutPlansModule],
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
