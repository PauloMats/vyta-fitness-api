import { PartialType } from '@nestjs/swagger';
import { CreateWorkoutDayDto } from './create-workout-day.dto';

export class UpdateWorkoutDayDto extends PartialType(CreateWorkoutDayDto) {}
