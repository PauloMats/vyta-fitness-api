import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { MediaKind } from '@prisma/client';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Media and health (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('exposes a public healthcheck', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.database).toBe('up');
  });

  it('creates media upload intents and stores completed assets', async () => {
    const student = await registerAndLogin(app, {
      email: 'media.student@vyta.app',
      fullName: 'Media Student',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const unauthenticatedResponse = await request(app.getHttpServer()).post('/api/v1/media/presign').send({
      kind: MediaKind.POST_IMAGE,
      fileName: 'progress.jpg',
    });

    expect(unauthenticatedResponse.status).toBe(401);

    const presignResponse = await request(app.getHttpServer())
      .post('/api/v1/media/presign')
      .set(authHeader(student.accessToken))
      .send({
        kind: MediaKind.POST_IMAGE,
        fileName: 'progress.jpg',
        mimeType: 'image/jpeg',
      });

    expect(presignResponse.status).toBe(201);
    expect(presignResponse.body.data.objectKey).toContain(`${student.user.id}/`);
    expect(presignResponse.body.data.headers['content-type']).toBe('image/jpeg');

    const completeResponse = await request(app.getHttpServer())
      .post('/api/v1/media/complete')
      .set(authHeader(student.accessToken))
      .send({
        kind: MediaKind.POST_IMAGE,
        objectKey: presignResponse.body.data.objectKey,
        mimeType: 'image/jpeg',
        sizeBytes: 2048,
      });

    expect(completeResponse.status).toBe(201);
    expect(completeResponse.body.data.objectKey).toBe(presignResponse.body.data.objectKey);
    expect(completeResponse.body.data.sizeBytes).toBe(2048);

    const storedAsset = await prisma.mediaAsset.findUnique({
      where: { id: completeResponse.body.data.id },
    });

    expect(storedAsset?.userId).toBe(student.user.id);
    expect(storedAsset?.kind).toBe(MediaKind.POST_IMAGE);
  });
});
