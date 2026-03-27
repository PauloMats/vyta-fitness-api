import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TrainerStudentStatus, WorkoutPlanVisibility } from '@prisma/client';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Trainers and trainer-students (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDatabase();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('lists trainers with filters and returns trainer details with template plans', async () => {
    const trainerA = await registerAndLogin(app, {
      email: 'ana.list@vyta.app',
      fullName: 'Ana Souza',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const trainerB = await registerAndLogin(app, {
      email: 'bruno.list@vyta.app',
      fullName: 'Bruno Lima',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'viewer.list@vyta.app',
      fullName: 'Viewer Student',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    await prisma.trainerProfile.update({
      where: { userId: trainerA.user.id },
      data: { specialties: ['hipertrofia', 'mobilidade'] },
    });
    await prisma.trainerProfile.update({
      where: { userId: trainerB.user.id },
      data: { specialties: ['corrida'] },
    });
    await prisma.workoutPlan.create({
      data: {
        trainerId: trainerA.user.id,
        title: 'Template Hipertrofia',
        visibility: WorkoutPlanVisibility.PUBLIC,
        isTemplate: true,
      },
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/trainers?search=ana&specialty=hipertrofia')
      .set(authHeader(student.accessToken));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).toBe(trainerA.user.id);
    expect(listResponse.body.meta.total).toBe(1);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/trainers/${trainerA.user.id}`)
      .set(authHeader(student.accessToken));

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.trainerWorkoutPlans).toHaveLength(1);
    expect(detailResponse.body.data.trainerWorkoutPlans[0].title).toBe('Template Hipertrofia');
  });

  it('creates trainer-student requests, enforces ownership and blocks a second active trainer', async () => {
    const trainerA = await registerAndLogin(app, {
      email: 'trainer.alpha@vyta.app',
      fullName: 'Trainer Alpha',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const trainerB = await registerAndLogin(app, {
      email: 'trainer.beta@vyta.app',
      fullName: 'Trainer Beta',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'student.link@vyta.app',
      fullName: 'Student Link',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const relationResponse = await request(app.getHttpServer())
      .post('/api/v1/trainer-students/request')
      .set(authHeader(student.accessToken))
      .send({
        trainerId: trainerA.user.id,
      });

    expect(relationResponse.status).toBe(201);
    expect(relationResponse.body.data.status).toBe('PENDING');

    const relationId = relationResponse.body.data.id;

    const duplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/trainer-students/request')
      .set(authHeader(student.accessToken))
      .send({
        trainerId: trainerA.user.id,
      });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.message).toBe('Relationship already exists');

    const wrongTrainerUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/trainer-students/${relationId}/status`)
      .set(authHeader(trainerB.accessToken))
      .send({
        status: TrainerStudentStatus.ACTIVE,
      });

    expect(wrongTrainerUpdateResponse.status).toBe(403);

    const activateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/trainer-students/${relationId}/status`)
      .set(authHeader(trainerA.accessToken))
      .send({
        status: TrainerStudentStatus.ACTIVE,
      });

    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.data.status).toBe('ACTIVE');

    const trainerListResponse = await request(app.getHttpServer())
      .get('/api/v1/trainer-students?status=ACTIVE')
      .set(authHeader(trainerA.accessToken));

    expect(trainerListResponse.status).toBe(200);
    expect(trainerListResponse.body.data).toHaveLength(1);
    expect(trainerListResponse.body.data[0].student.id).toBe(student.user.id);

    const studentListResponse = await request(app.getHttpServer())
      .get('/api/v1/trainer-students?status=ACTIVE')
      .set(authHeader(student.accessToken));

    expect(studentListResponse.status).toBe(200);
    expect(studentListResponse.body.data).toHaveLength(1);
    expect(studentListResponse.body.data[0].trainer.id).toBe(trainerA.user.id);

    const secondActiveTrainerResponse = await request(app.getHttpServer())
      .post('/api/v1/trainer-students/request')
      .set(authHeader(student.accessToken))
      .send({
        trainerId: trainerB.user.id,
      });

    expect(secondActiveTrainerResponse.status).toBe(409);
    expect(secondActiveTrainerResponse.body.error.message).toBe('Student already has an active trainer');
  });
});
