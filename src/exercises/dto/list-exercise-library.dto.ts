import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExerciseBodyRegion,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseForceType,
  ExerciseMechanic,
  ExerciseMovementPattern,
} from '@prisma/client';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListExerciseLibraryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  muscleGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional({ enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiPropertyOptional({ enum: ExerciseBodyRegion })
  @IsOptional()
  @IsEnum(ExerciseBodyRegion)
  bodyRegion?: ExerciseBodyRegion;

  @ApiPropertyOptional({ enum: ExerciseDifficulty })
  @IsOptional()
  @IsEnum(ExerciseDifficulty)
  difficulty?: ExerciseDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryMuscle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryMuscle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipmentItem?: string;

  @ApiPropertyOptional({ enum: ExerciseMovementPattern })
  @IsOptional()
  @IsEnum(ExerciseMovementPattern)
  movementPattern?: ExerciseMovementPattern;

  @ApiPropertyOptional({ enum: ExerciseMechanic })
  @IsOptional()
  @IsEnum(ExerciseMechanic)
  mechanic?: ExerciseMechanic;

  @ApiPropertyOptional({ enum: ExerciseForceType })
  @IsOptional()
  @IsEnum(ExerciseForceType)
  forceType?: ExerciseForceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
