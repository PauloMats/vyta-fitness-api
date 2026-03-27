import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TrainerStudentStatus } from '@prisma/client';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Users and students (e2e)', () => {
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

  it('returns and updates the current user while enforcing username uniqueness', async () => {
    const student = await registerAndLogin(app, {
      email: 'student.profile@vyta.app',
      fullName: 'Student Profile',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const anotherStudent = await registerAndLogin(app, {
      email: 'second.profile@vyta.app',
      fullName: 'Second Student',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set(authHeader(student.accessToken));

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('student.profile@vyta.app');
    expect(meResponse.body.data.passwordHash).toBeUndefined();

    const updateResponse = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(student.accessToken))
      .send({
        username: 'Student.Profile',
        fullName: 'Student Profile Updated',
        phone: '+55 85 99999-9999',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.username).toBe('student.profile');
    expect(updateResponse.body.data.fullName).toBe('Student Profile Updated');

    const conflictResponse = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(anotherStudent.accessToken))
      .send({
        username: 'student.profile',
      });

    expect(conflictResponse.status).toBe(409);
    expect(conflictResponse.body.error.message).toBe('Username already in use');
  });

  it('validates unknown payload fields and allows students to manage only their profile', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.student-profile@vyta.app',
      fullName: 'Trainer Student Profile',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'student.details@vyta.app',
      fullName: 'Student Details',
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

    const invalidPatchResponse = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(student.accessToken))
      .send({
        fullName: 'Invalid Payload',
        unexpectedField: 'should fail',
      });

    expect(invalidPatchResponse.status).toBe(400);
    expect(invalidPatchResponse.body.error.message).toContain('property unexpectedField should not exist');

    const studentMeResponse = await request(app.getHttpServer())
      .get('/api/v1/students/me')
      .set(authHeader(student.accessToken));

    expect(studentMeResponse.status).toBe(200);
    expect(studentMeResponse.body.data.studentRelationships).toHaveLength(1);
    expect(studentMeResponse.body.data.studentRelationships[0].trainer.id).toBe(trainer.user.id);

    const updateStudentResponse = await request(app.getHttpServer())
      .patch('/api/v1/students/me')
      .set(authHeader(student.accessToken))
      .send({
        currentHeightCm: 172.5,
        currentWeightKg: 79.1,
        targetWeightKg: 74.5,
        limitations: 'Dor leve no ombro direito.',
        bio: 'Aluno focado em recomposicao corporal.',
      });

    expect(updateStudentResponse.status).toBe(200);
    expect(Number(updateStudentResponse.body.data.studentProfile.currentHeightCm)).toBe(172.5);
    expect(Number(updateStudentResponse.body.data.studentProfile.currentWeightKg)).toBe(79.1);
    expect(updateStudentResponse.body.data.bio).toBe('Aluno focado em recomposicao corporal.');

    const trainerStudentProfileResponse = await request(app.getHttpServer())
      .get('/api/v1/students/me')
      .set(authHeader(trainer.accessToken));

    expect(trainerStudentProfileResponse.status).toBe(403);
    expect(trainerStudentProfileResponse.body.error.message).toBe('Forbidden resource');
  });
});
