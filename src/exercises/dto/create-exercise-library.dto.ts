import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExerciseLibraryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(140)
  slug?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  muscleGroup!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  equipment?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  instructions!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultMediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultThumbUrl?: string;
}
