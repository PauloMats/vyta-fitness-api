import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestFriendshipDto {
  @ApiProperty()
  @IsString()
  addresseeId!: string;
}
