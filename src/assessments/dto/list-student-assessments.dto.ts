import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentStatus, AssessmentType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListStudentAssessmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AssessmentStatus })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({ enum: AssessmentType })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;
}
