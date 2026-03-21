import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TrainerStudentStatus } from '@prisma/client';
import { cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Workout plans (e2e)', () => {
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

  it('creates, lists, updates and deletes workout plans', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.plan@vyta.app',
      fullName: 'Trainer Plan',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'student.plan@vyta.app',
      fullName: 'Student Plan',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    await prisma.trainerStudent.create({
      data: {
        trainerId: trainer.user.id,
        studentId: student.user.id,
        status: TrainerStudentStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/workout-plans')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({
        title: 'Plano A',
        description: 'Plano de teste',
        goal: 'Hipertrofia',
        studentId: student.user.id,
        days: [
          {
            weekDay: 1,
            order: 1,
            title: 'Lower',
            focus: 'Pernas',
            estimatedMinutes: 50,
            exercises: [
              {
                order: 1,
                nameSnapshot: 'Agachamento Livre',
                muscleGroupSnapshot: 'Quadriceps',
                sets: 4,
                reps: '8-10',
                restSeconds: 90,
              },
            ],
          },
        ],
      });

    expect(createResponse.status).toBe(201);
    const planId = createResponse.body.data.id;
    expect(createResponse.body.data.days).toHaveLength(1);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/workout-plans')
      .set('Authorization', `Bearer ${trainer.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/workout-plans/${planId}`)
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({ title: 'Plano A atualizado' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe('Plano A atualizado');

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/workout-plans/${planId}`)
      .set('Authorization', `Bearer ${trainer.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.message).toContain('deleted');
  });
});
