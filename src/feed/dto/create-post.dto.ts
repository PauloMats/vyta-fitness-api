import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaKind, PostVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workoutSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbUrl?: string;

  @ApiPropertyOptional({ enum: MediaKind })
  @IsOptional()
  @IsEnum(MediaKind)
  mediaKind?: MediaKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({ enum: PostVisibility, default: PostVisibility.FRIENDS })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}
