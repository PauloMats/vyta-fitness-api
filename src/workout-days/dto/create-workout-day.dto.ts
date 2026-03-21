import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CreateWorkoutExerciseDto } from './create-workout-exercise.dto';

export class CreateWorkoutDayDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(7)
  weekDay!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  focus!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  estimatedMinutes!: number;

  @ApiPropertyOptional({ type: [CreateWorkoutExerciseDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises?: CreateWorkoutExerciseDto[];
}
