import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class UpdateStudentImportExerciseMatchDto {
  @IsString()
  rawExerciseName!: string;

  @IsOptional()
  @IsString()
  matchedExerciseLibraryId?: string | null;
}

export class UpdateStudentImportMappingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  student?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  assessment?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  workoutPlan?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [UpdateStudentImportExerciseMatchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStudentImportExerciseMatchDto)
  exerciseMatches?: UpdateStudentImportExerciseMatchDto[];
}
