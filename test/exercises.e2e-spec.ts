import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Exercises (e2e)', () => {
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

  it('creates, filters and retrieves exercise library entries', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.exercise@vyta.app',
      fullName: 'Trainer Exercise',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'student.exercise@vyta.app',
      fullName: 'Student Exercise',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const forbiddenCreateResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library')
      .set(authHeader(student.accessToken))
      .send({
        name: 'Romanian Deadlift',
        muscleGroup: 'Posterior chain',
        instructions: 'Keep the bar close to the body.',
      });

    expect(forbiddenCreateResponse.status).toBe(403);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library')
      .set(authHeader(trainer.accessToken))
      .send({
        name: 'Romanian Deadlift',
        muscleGroup: 'Posterior chain',
        equipment: 'Barbell',
        instructions: 'Control the eccentric and keep the spine neutral.',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.slug).toBe('romanian-deadlift');

    const duplicateSlugResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library')
      .set(authHeader(trainer.accessToken))
      .send({
        name: 'RDL Variation',
        slug: 'romanian-deadlift',
        muscleGroup: 'Posterior chain',
        instructions: 'Duplicate slug should fail.',
      });

    expect(duplicateSlugResponse.status).toBe(409);
    expect(duplicateSlugResponse.body.error.message).toBe('Exercise slug already exists');

    await prisma.exerciseLibrary.create({
      data: {
        name: 'Lat Pulldown',
        slug: 'lat-pulldown',
        muscleGroup: 'Back',
        equipment: 'Machine',
        instructions: 'Pull towards the upper chest.',
      },
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/exercises/library?search=dead&equipment=Barbell')
      .set(authHeader(student.accessToken));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].name).toBe('Romanian Deadlift');

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/exercises/library/${createResponse.body.data.id}`)
      .set(authHeader(student.accessToken));

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.slug).toBe('romanian-deadlift');
  });
});
