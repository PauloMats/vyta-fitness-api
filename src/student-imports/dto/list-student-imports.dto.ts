import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentImportSourcePlatform, StudentImportStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListStudentImportsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StudentImportStatus })
  @IsOptional()
  @IsEnum(StudentImportStatus)
  status?: StudentImportStatus;

  @ApiPropertyOptional({ enum: StudentImportSourcePlatform })
  @IsOptional()
  @IsEnum(StudentImportSourcePlatform)
  sourcePlatform?: StudentImportSourcePlatform;
}
