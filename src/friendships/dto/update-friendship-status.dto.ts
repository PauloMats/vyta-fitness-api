import { ApiProperty } from '@nestjs/swagger';
import { FriendshipStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateFriendshipStatusDto {
  @ApiProperty({ enum: FriendshipStatus, example: FriendshipStatus.ACCEPTED })
  @IsEnum(FriendshipStatus)
  status!: FriendshipStatus;
}
