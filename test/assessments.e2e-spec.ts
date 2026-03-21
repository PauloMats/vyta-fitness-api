import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { BodyCompositionMethod, TrainerStudentStatus } from '@prisma/client';
import { cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Assessments (e2e)', () => {
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

  it('creates, completes and lists assessments with progress', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.assessment@vyta.app',
      fullName: 'Trainer Assessment',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const student = await registerAndLogin(app, {
      email: 'student.assessment@vyta.app',
      fullName: 'Student Assessment',
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
      .post('/api/v1/assessments')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({
        studentId: student.user.id,
        assessmentDate: '2026-03-15T09:00:00.000Z',
        assessmentType: 'INITIAL',
        notes: 'Avaliacao inicial completa',
        screening: {
          symptoms: 'Sem sinais agudos.',
          knownConditions: 'Dor lombar leve.',
          medications: 'Nenhuma.',
          riskFlags: ['low_back'],
        },
        anamnesis: {
          objectivePrimary: 'Reducao de gordura',
          activityLevel: 'moderado',
          sleepQuality: 'boa',
          stressLevel: 4,
        },
        vitals: {
          weightKg: 82.4,
          heightCm: 178,
          restingHeartRate: 62,
        },
        circumferences: [
          {
            kind: 'WAIST',
            valueCm: 84.2,
            order: 1,
          },
        ],
        bodyComposition: {
          method: BodyCompositionMethod.BIA,
          bodyFatPercent: 19.4,
          isComparable: true,
        },
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.status).toBe('DRAFT');

    const assessmentId = createResponse.body.data.id;

    const completeResponse = await request(app.getHttpServer())
      .post(`/api/v1/assessments/${assessmentId}/complete`)
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({ version: createResponse.body.data.version });

    expect(completeResponse.status).toBe(201);
    expect(completeResponse.body.data.status).toBe('COMPLETED');

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/students/${student.user.id}/assessments`)
      .set('Authorization', `Bearer ${trainer.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const progressResponse = await request(app.getHttpServer())
      .get(`/api/v1/students/${student.user.id}/progress`)
      .set('Authorization', `Bearer ${student.accessToken}`);

    expect(progressResponse.status).toBe(200);
    expect(progressResponse.body.data.latest.id).toBe(assessmentId);
  });
});
