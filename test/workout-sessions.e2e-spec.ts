import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TrainerStudentStatus } from '@prisma/client';
import { cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Workout sessions (e2e)', () => {
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

  it('starts, records sets, finishes and lists workout sessions', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.session@vyta.app',
      fullName: 'Trainer Session',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'student.session@vyta.app',
      fullName: 'Student Session',
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

    const planResponse = await request(app.getHttpServer())
      .post('/api/v1/workout-plans')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({
        title: 'Plano Sessao',
        goal: 'Consistencia',
        studentId: student.user.id,
        days: [
          {
            weekDay: 2,
            order: 1,
            title: 'Push',
            focus: 'Peito',
            estimatedMinutes: 45,
            exercises: [
              {
                order: 1,
                nameSnapshot: 'Supino Reto',
                muscleGroupSnapshot: 'Peito',
                sets: 4,
                reps: '8',
                restSeconds: 90,
              },
            ],
          },
        ],
      });

    const dayId = planResponse.body.data.days[0].id;
    const exerciseId = planResponse.body.data.days[0].exercises[0].id;

    const startResponse = await request(app.getHttpServer())
      .post('/api/v1/workout-sessions/start')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({
        workoutPlanId: planResponse.body.data.id,
        workoutDayId: dayId,
        feelingPre: 4,
      });

    expect(startResponse.status).toBe(201);
    const sessionId = startResponse.body.data.id;

    const setResponse = await request(app.getHttpServer())
      .post(`/api/v1/workout-sessions/${sessionId}/sets`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({
        workoutExerciseId: exerciseId,
        order: 1,
        targetReps: 8,
        actualReps: 8,
        actualLoadKg: 40,
      });

    expect(setResponse.status).toBe(201);
    expect(setResponse.body.data.workoutExerciseId).toBe(exerciseId);

    const finishResponse = await request(app.getHttpServer())
      .patch(`/api/v1/workout-sessions/${sessionId}/finish`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ feelingPost: 5, notes: 'Bom treino' });

    expect(finishResponse.status).toBe(200);
    expect(finishResponse.body.data.status).toBe('COMPLETED');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/workout-sessions/me')
      .set('Authorization', `Bearer ${student.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
  });
});
