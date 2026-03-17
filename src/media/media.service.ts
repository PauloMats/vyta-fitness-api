import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteMediaDto } from './dto/complete-media.dto';
import { PresignMediaDto } from './dto/presign-media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  presign(user: JwtUser, dto: PresignMediaDto) {
    const driver = this.configService.get<string>('STORAGE_DRIVER', 'noop');
    const objectKey = `${user.id}/${Date.now()}-${dto.fileName}`;
    const bucket = this.configService.get<string>('S3_BUCKET', 'vyta-media');
    const endpoint = this.configService.get<string>('S3_ENDPOINT', '');

    return {
      driver,
      objectKey,
      method: 'PUT',
      uploadUrl: endpoint ? `${endpoint.replace(/\/$/, '')}/${bucket}/${objectKey}` : `https://upload.vyta.local/${objectKey}`,
      headers: dto.mimeType ? { 'content-type': dto.mimeType } : {},
    };
  }

  async complete(user: JwtUser, dto: CompleteMediaDto) {
    const driver = this.configService.get<string>('STORAGE_DRIVER', 'noop');
    const bucket = this.configService.get<string>('S3_BUCKET', 'vyta-media');
    const endpoint = this.configService.get<string>('S3_ENDPOINT', '');
    const finalUrl =
      dto.url ??
      (endpoint ? `${endpoint.replace(/\/$/, '')}/${bucket}/${dto.objectKey}` : `https://cdn.vyta.local/${dto.objectKey}`);

    return this.prisma.mediaAsset.create({
      data: {
        userId: user.id,
        kind: dto.kind,
        provider: driver,
        bucket,
        objectKey: dto.objectKey,
        url: finalUrl,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });
  }
}
