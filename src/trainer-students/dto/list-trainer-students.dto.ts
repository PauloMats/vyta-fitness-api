import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrainerStudentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListTrainerStudentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TrainerStudentStatus })
  @IsOptional()
  @IsEnum(TrainerStudentStatus)
  status?: TrainerStudentStatus;
}
