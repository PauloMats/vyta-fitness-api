import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentStatus, WorkoutPlanVisibility } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class ConfirmStudentImportDto {
  @ApiProperty()
  @IsBoolean()
  createStudent!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  existingStudentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiProperty()
  @IsBoolean()
  createAssessment!: boolean;

  @ApiPropertyOptional({ enum: AssessmentStatus, enumName: 'AssessmentStatusForImport' })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  assessmentStatus?: AssessmentStatus;

  @ApiProperty()
  @IsBoolean()
  createWorkoutPlan!: boolean;

  @ApiPropertyOptional({ enum: WorkoutPlanVisibility })
  @IsOptional()
  @IsEnum(WorkoutPlanVisibility)
  planVisibility?: WorkoutPlanVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}
