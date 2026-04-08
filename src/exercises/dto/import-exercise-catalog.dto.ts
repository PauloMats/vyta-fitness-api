import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ImportExerciseCatalogDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;
}
