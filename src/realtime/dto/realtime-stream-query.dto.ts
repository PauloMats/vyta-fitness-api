import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RealtimeStreamQueryDto {
  @ApiPropertyOptional({
    description: 'Fallback para EventSource nativo, quando não for possível enviar Authorization header.',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Lista separada por vírgula dos canais desejados: notifications,messages,support',
    example: 'notifications,messages',
  })
  @IsOptional()
  @IsString()
  channels?: string;
}
