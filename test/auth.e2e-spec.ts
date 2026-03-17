import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { cleanDatabase, createTestApp, prisma } from './test-utils';

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
  });

  it('registers, logs in, refreshes and returns the current user', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'student.auth@vyta.app',
      fullName: 'Student Auth',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.email).toBe('student.auth@vyta.app');

    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'student.auth@vyta.app',
      password: 'Vyta@1234',
    });

    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.data.accessToken).toBeDefined();

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('student.auth@vyta.app');

    const refreshResponse = await request(app.getHttpServer()).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(refreshResponse.status).toBe(201);
    expect(refreshResponse.body.data.accessToken).toBeDefined();
  });
});
