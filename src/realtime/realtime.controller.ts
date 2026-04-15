import {
  Controller,
  Headers,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { RealtimeStreamQueryDto } from './dto/realtime-stream-query.dto';
import { RealtimeService } from './realtime.service';
import { RealtimeChannel, realtimeChannels } from './types/realtime-event.type';

@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Public()
  @ApiBearerAuth()
  @ApiExcludeEndpoint(false)
  @Sse('stream')
  async stream(
    @Query() query: RealtimeStreamQueryDto,
    @Headers('authorization') authorization?: string,
  ): Promise<Observable<MessageEvent>> {
    const accessToken = this.extractAccessToken(authorization, query.accessToken);
    const user = await this.authService.authenticateAccessToken(accessToken);
    const channels = this.parseChannels(query.channels);

    return this.realtimeService.createUserStream(user.id, channels);
  }

  private extractAccessToken(authorization?: string, fallback?: string) {
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice(7);
    }

    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }

    throw new UnauthorizedException('Access token is required for realtime stream');
  }

  private parseChannels(channels?: string): RealtimeChannel[] | undefined {
    if (!channels?.trim()) {
      return undefined;
    }

    const parsed = channels
      .split(',')
      .map((channel) => channel.trim())
      .filter((channel): channel is RealtimeChannel =>
        realtimeChannels.includes(channel as RealtimeChannel),
      );

    return parsed.length > 0 ? parsed : undefined;
  }
}
