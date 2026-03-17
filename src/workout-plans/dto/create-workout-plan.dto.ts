import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutPlanVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { CreateWorkoutDayDto } from '../../workout-days/dto/create-workout-day.dto';

export class CreateWorkoutPlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  goal?: string;

  @ApiProperty({ enum: WorkoutPlanVisibility, default: WorkoutPlanVisibility.TRAINER_ONLY })
  @IsEnum(WorkoutPlanVisibility)
  visibility: WorkoutPlanVisibility = WorkoutPlanVisibility.TRAINER_ONLY;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiPropertyOptional({ type: [CreateWorkoutDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutDayDto)
  days?: CreateWorkoutDayDto[];
}
