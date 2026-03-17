import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StartWorkoutSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workoutPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workoutDayId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  feelingPre?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
