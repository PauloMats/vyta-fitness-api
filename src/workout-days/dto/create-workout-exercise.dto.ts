import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateWorkoutExerciseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exerciseLibraryId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameSnapshot!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  muscleGroupSnapshot?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sets!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  reps!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  restSeconds!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tempo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  rir?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbUrl?: string;
}
