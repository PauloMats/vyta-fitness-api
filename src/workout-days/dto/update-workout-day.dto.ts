import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateWorkoutDayDto } from './create-workout-day.dto';

export class UpdateWorkoutDayDto extends PartialType(CreateWorkoutDayDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
