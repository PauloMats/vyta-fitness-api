import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateExerciseLibraryDto } from './create-exercise-library.dto';

export class UpdateExerciseLibraryDto extends PartialType(CreateExerciseLibraryDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
