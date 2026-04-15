import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportCategory })
  @IsEnum(SupportCategory)
  category!: SupportCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  message!: string;
}
