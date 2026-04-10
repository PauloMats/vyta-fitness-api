import pdfParse from 'pdf-parse';
import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

jest.mock('pdf-parse', () => jest.fn());

const pdfParseMock = pdfParse as jest.MockedFunction<typeof pdfParse>;
const fakePdfBuffer = Buffer.from('%PDF-1.4 fake pdf for tests');

describe('StudentImports (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    pdfParseMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads a PDF, generates preview and confirms student import', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.import@vyta.app',
      fullName: 'Trainer Import',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    await prisma.exerciseLibrary.createMany({
      data: [
        {
          name: 'Romanian Deadlift',
          slug: 'romanian-deadlift',
          muscleGroup: 'Posterior Chain',
          instructions: 'Keep the bar close to your body.',
        },
        {
          name: 'Lat Pulldown',
          slug: 'lat-pulldown',
          muscleGroup: 'Back',
          instructions: 'Pull the bar towards your chest.',
        },
      ],
    });

    pdfParseMock.mockResolvedValueOnce({
      text: [
        'Aluno: Joao Silva',
        'Email: joao.silva@example.com',
        'Telefone: (11) 99999-8888',
        'Peso: 82,4',
        'Altura: 178',
        'Data da avaliacao: 10/04/2026',
        '% Gordura: 18,5',
        'Treino: Treino de Hipertrofia',
        'Objetivo: Hipertrofia',
        'Romanian Deadlift 4x10 90s',
        'Lat Pulldown 3x12 60s',
      ].join('\n'),
    } as any);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/student-imports')
      .set(authHeader(trainer.accessToken))
      .attach('file', fakePdfBuffer, {
        filename: 'aluno-origem.pdf',
        contentType: 'application/pdf',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.status).toBe('REVIEW_READY');
    expect(createResponse.body.data.preview.student.fullName.value).toBe('Joao Silva');
    expect(createResponse.body.data.preview.workoutPlan.days[0].exercises).toHaveLength(2);
    expect(createResponse.body.data.preview.summary.unmatchedExercises).toBe(0);

    const importId = createResponse.body.data.id as string;

    const confirmResponse = await request(app.getHttpServer())
      .post(`/api/v1/student-imports/${importId}/confirm`)
      .set(authHeader(trainer.accessToken))
      .send({
        createStudent: true,
        createAssessment: true,
        assessmentStatus: 'COMPLETED',
        createWorkoutPlan: true,
        planVisibility: 'PRIVATE',
      });

    expect(confirmResponse.status).toBe(201);
    expect(confirmResponse.body.data.studentId).toBeTruthy();
    expect(confirmResponse.body.data.assessmentId).toBeTruthy();
    expect(confirmResponse.body.data.planId).toBeTruthy();

    const importedStudent = await prisma.user.findUniqueOrThrow({
      where: { id: confirmResponse.body.data.studentId },
      include: { studentProfile: true },
    });
    expect(importedStudent.fullName).toBe('Joao Silva');
    expect(importedStudent.studentProfile?.currentWeightKg?.toString()).toBe('82.4');

    const plan = await prisma.workoutPlan.findUniqueOrThrow({
      where: { id: confirmResponse.body.data.planId },
      include: { days: { include: { exercises: true } } },
    });
    expect(plan.days[0].exercises).toHaveLength(2);
  });

  it('blocks access from another trainer and supports manual exercise mapping', async () => {
    const trainerOne = await registerAndLogin(app, {
      email: 'trainer.one.import@vyta.app',
      fullName: 'Trainer One',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });
    const trainerTwo = await registerAndLogin(app, {
      email: 'trainer.two.import@vyta.app',
      fullName: 'Trainer Two',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });

    const exercise = await prisma.exerciseLibrary.create({
      data: {
        name: 'Supino Reto',
        slug: 'supino-reto',
        muscleGroup: 'Peito',
        instructions: 'Empurre a barra em linha reta.',
      },
    });

    pdfParseMock.mockResolvedValueOnce({
      text: ['Aluno: Maria Souza', 'Peso: 68', 'Altura: 165', 'Treino: Treino A', 'Supino reto com barra 4x8 90s'].join('\n'),
    } as any);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/student-imports')
      .set(authHeader(trainerOne.accessToken))
      .attach('file', fakePdfBuffer, {
        filename: 'aluna.pdf',
        contentType: 'application/pdf',
      });

    expect(createResponse.status).toBe(201);
    const importId = createResponse.body.data.id as string;

    const forbiddenResponse = await request(app.getHttpServer())
      .get(`/api/v1/student-imports/${importId}`)
      .set(authHeader(trainerTwo.accessToken));

    expect(forbiddenResponse.status).toBe(403);

    const mappingResponse = await request(app.getHttpServer())
      .patch(`/api/v1/student-imports/${importId}/mapping`)
      .set(authHeader(trainerOne.accessToken))
      .send({
        student: {
          email: {
            value: 'maria.importada@example.com',
            confidence: 1,
            editable: true,
          },
        },
        exerciseMatches: [
          {
            rawExerciseName: 'Supino reto com barra',
            matchedExerciseLibraryId: exercise.id,
          },
        ],
      });

    expect(mappingResponse.status).toBe(200);
    expect(mappingResponse.body.data.workoutPlan.days[0].exercises[0].matchedExerciseLibraryId).toBe(
      exercise.id,
    );
  });
});
