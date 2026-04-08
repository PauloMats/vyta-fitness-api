import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseBodyRegion, ExerciseCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ExerciseAutocompleteQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 10, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 10;

  @ApiPropertyOptional({ enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiPropertyOptional({ enum: ExerciseBodyRegion })
  @IsOptional()
  @IsEnum(ExerciseBodyRegion)
  bodyRegion?: ExerciseBodyRegion;
}
