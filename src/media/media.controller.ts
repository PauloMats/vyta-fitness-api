import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { CompleteMediaDto } from './dto/complete-media.dto';
import { PresignMediaDto } from './dto/presign-media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign')
  presign(@CurrentUser() user: JwtUser, @Body() dto: PresignMediaDto) {
    return this.mediaService.presign(user, dto);
  }

  @Post('complete')
  complete(@CurrentUser() user: JwtUser, @Body() dto: CompleteMediaDto) {
    return this.mediaService.complete(user, dto);
  }
}
