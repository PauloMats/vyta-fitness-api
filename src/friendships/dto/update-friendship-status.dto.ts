import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateFriendshipStatusDto {
  @ApiProperty({ example: 'ACCEPTED' })
  @IsString()
  @IsIn(['PENDING', 'ACCEPTED', 'BLOCKED', 'REJECTED'])
  status!: string;
}
