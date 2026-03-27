import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { authHeader, cleanDatabase, createTestApp, prisma } from './test-utils';

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
    const registerResponse = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'student.auth@vyta.app',
      fullName: 'Student Auth',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.email).toBe('student.auth@vyta.app');

    const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'student.auth@vyta.app',
      password: 'Vyta@1234',
    });

    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.data.accessToken).toBeDefined();

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('student.auth@vyta.app');

    const refreshResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(refreshResponse.status).toBe(201);
    expect(refreshResponse.body.data.accessToken).toBeDefined();

    const reusedRefreshResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(reusedRefreshResponse.status).toBe(401);
  });

  it('normalizes identity fields, stores device context and revokes refresh tokens on logout', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'Mixed.Case@Vyta.App',
      username: 'Trainer.Mixed',
      fullName: 'Trainer Mixed',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.email).toBe('mixed.case@vyta.app');
    expect(registerResponse.body.data.user.username).toBe('trainer.mixed');

    const duplicateRegisterResponse = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'mixed.case@vyta.app',
      username: 'trainer.mixed',
      fullName: 'Trainer Duplicate',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    expect(duplicateRegisterResponse.status).toBe(409);
    expect(duplicateRegisterResponse.body.error.message).toBe('Email or username already in use');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'vyta-e2e-browser')
      .send({
        email: 'MIXED.CASE@VYTA.APP',
        password: 'Vyta@1234',
        deviceId: 'browser-chrome',
      });

    expect(loginResponse.status).toBe(201);

    const storedRefreshToken = await prisma.refreshToken.findFirst({
      where: { userId: registerResponse.body.data.user.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(storedRefreshToken?.deviceId).toBe('browser-chrome');
    expect(storedRefreshToken?.userAgent).toBe('vyta-e2e-browser');

    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set(authHeader(loginResponse.body.data.accessToken))
      .send({
        refreshToken: loginResponse.body.data.refreshToken,
      });

    expect(logoutResponse.status).toBe(201);

    const refreshAfterLogoutResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(refreshAfterLogoutResponse.status).toBe(401);
  });
});
