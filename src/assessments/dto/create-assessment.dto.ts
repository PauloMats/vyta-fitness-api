import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssessmentCircumferenceKind,
  AssessmentPhotoPosition,
  AssessmentSkinfoldKind,
  AssessmentType,
  BodyCompositionMethod,
  FitnessTestCategory,
  MeasurementSide,
  ScreeningClearance,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AssessmentScreeningDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(800)
  symptoms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(800)
  knownConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(800)
  medications?: string;

  @ApiPropertyOptional({ enum: ScreeningClearance })
  @IsOptional()
  @IsEnum(ScreeningClearance)
  clearance?: ScreeningClearance;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskFlags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  restrictions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}

class AssessmentAnamnesisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  objectivePrimary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  objectiveSecondary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  activityLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sleepQuality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  stressLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(800)
  familyHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(800)
  injuriesHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(800)
  limitations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  observations?: string;
}

class AssessmentVitalsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(500)
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(300)
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(250)
  restingHeartRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(300)
  systolicBp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(200)
  diastolicBp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(100)
  spo2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(500)
  glucose?: number;
}

class AssessmentCircumferenceDto {
  @ApiProperty({ enum: AssessmentCircumferenceKind })
  @IsEnum(AssessmentCircumferenceKind)
  kind!: AssessmentCircumferenceKind;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(500)
  valueCm!: number;

  @ApiPropertyOptional({ enum: MeasurementSide })
  @IsOptional()
  @IsEnum(MeasurementSide)
  side?: MeasurementSide;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  protocol?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;
}

class AssessmentSkinfoldDto {
  @ApiProperty({ enum: AssessmentSkinfoldKind })
  @IsEnum(AssessmentSkinfoldKind)
  kind!: AssessmentSkinfoldKind;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(200)
  valueMm!: number;

  @ApiPropertyOptional({ enum: MeasurementSide })
  @IsOptional()
  @IsEnum(MeasurementSide)
  side?: MeasurementSide;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  measurementIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  protocol?: string;
}

class AssessmentBodyCompositionDto {
  @ApiProperty({ enum: BodyCompositionMethod })
  @IsEnum(BodyCompositionMethod)
  method!: BodyCompositionMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  protocol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  equation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  bodyFatPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  fatMassKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  leanMassKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  muscleMassKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  visceralFat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceDevice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isComparable?: boolean;
}

class AssessmentFitnessTestDto {
  @ApiProperty({ enum: FitnessTestCategory })
  @IsEnum(FitnessTestCategory)
  category!: FitnessTestCategory;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  testCode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  rawValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

class AssessmentPhotoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  mediaAssetId!: string;

  @ApiProperty({ enum: AssessmentPhotoPosition })
  @IsEnum(AssessmentPhotoPosition)
  position!: AssessmentPhotoPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  consentAcceptedAt?: string;
}

class AssessmentReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  recommendations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  warnings?: string;
}

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  studentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  trainerId?: string;

  @ApiProperty()
  @IsDateString()
  assessmentDate!: string;

  @ApiProperty({ enum: AssessmentType })
  @IsEnum(AssessmentType)
  assessmentType!: AssessmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: AssessmentScreeningDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentScreeningDto)
  screening?: AssessmentScreeningDto;

  @ApiPropertyOptional({ type: AssessmentAnamnesisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentAnamnesisDto)
  anamnesis?: AssessmentAnamnesisDto;

  @ApiPropertyOptional({ type: AssessmentVitalsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentVitalsDto)
  vitals?: AssessmentVitalsDto;

  @ApiPropertyOptional({ type: [AssessmentCircumferenceDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentCircumferenceDto)
  circumferences?: AssessmentCircumferenceDto[];

  @ApiPropertyOptional({ type: [AssessmentSkinfoldDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentSkinfoldDto)
  skinfolds?: AssessmentSkinfoldDto[];

  @ApiPropertyOptional({ type: AssessmentBodyCompositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentBodyCompositionDto)
  bodyComposition?: AssessmentBodyCompositionDto;

  @ApiPropertyOptional({ type: [AssessmentFitnessTestDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentFitnessTestDto)
  fitnessTests?: AssessmentFitnessTestDto[];

  @ApiPropertyOptional({ type: [AssessmentPhotoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentPhotoDto)
  photos?: AssessmentPhotoDto[];

  @ApiPropertyOptional({ type: AssessmentReportDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentReportDto)
  report?: AssessmentReportDto;
}
