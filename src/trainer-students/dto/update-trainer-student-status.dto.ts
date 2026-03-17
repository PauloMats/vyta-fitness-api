import { ApiProperty } from '@nestjs/swagger';
import { TrainerStudentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTrainerStudentStatusDto {
  @ApiProperty({ enum: TrainerStudentStatus })
  @IsEnum(TrainerStudentStatus)
  status!: TrainerStudentStatus;
}
