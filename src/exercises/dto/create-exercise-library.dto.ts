import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExerciseBodyRegion,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseForceType,
  ExerciseMechanic,
  ExerciseMovementPattern,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateExerciseLibraryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  originalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiPropertyOptional({ enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

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

  @ApiPropertyOptional({ enum: ExerciseDifficulty })
  @IsOptional()
  @IsEnum(ExerciseDifficulty)
  difficulty?: ExerciseDifficulty;

  @ApiPropertyOptional({ enum: ExerciseBodyRegion })
  @IsOptional()
  @IsEnum(ExerciseBodyRegion)
  bodyRegion?: ExerciseBodyRegion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnilateral?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(80)
  muscleGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  equipment?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultMediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultThumbUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  primaryMuscles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  secondaryMuscles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  equipmentList?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  instructionSteps?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  instructionsPtBrAuto?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tips?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  contraindications?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceExternalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceLicense?: string;
}
