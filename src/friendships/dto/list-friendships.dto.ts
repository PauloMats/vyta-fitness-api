import { ApiPropertyOptional } from '@nestjs/swagger';
import { FriendshipStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListFriendshipsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FriendshipStatus })
  @IsOptional()
  @IsEnum(FriendshipStatus)
  status?: FriendshipStatus;
}
