import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateWorkoutPlanDto } from './create-workout-plan.dto';

export class UpdateWorkoutPlanDto extends PartialType(CreateWorkoutPlanDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
