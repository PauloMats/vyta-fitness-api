import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDirectMessageDto {
  @ApiProperty()
  @IsString()
  recipientId!: string;

  @ApiPropertyOptional({ enum: MessageCategory })
  @IsOptional()
  @IsEnum(MessageCategory)
  category?: MessageCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  body!: string;
}
