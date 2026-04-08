import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
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

    const password = 'Vyta@1234';
    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        email: 'admin.exercise@vyta.app',
        fullName: 'Admin Exercise',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    const adminLoginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'admin.exercise@vyta.app',
      password,
    });
    const admin = adminLoginResponse.body.data as {
      accessToken: string;
    };

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
        primaryMuscles: ['HAMSTRINGS'],
        instructionSteps: ['Keep the bar close to the body.'],
      });

    expect(forbiddenCreateResponse.status).toBe(403);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library')
      .set(authHeader(trainer.accessToken))
      .send({
        name: 'Romanian Deadlift',
        originalName: 'Romanian Deadlift',
        description: 'Posterior chain hinge exercise.',
        category: 'STRENGTH',
        bodyRegion: 'LOWER_BODY',
        movementPattern: 'HIP_HINGE',
        mechanic: 'COMPOUND',
        forceType: 'PULL',
        difficulty: 'INTERMEDIATE',
        primaryMuscles: ['HAMSTRINGS', 'GLUTES'],
        secondaryMuscles: ['LOWER_BACK'],
        equipmentList: ['BARBELL'],
        instructionSteps: ['Control the eccentric and keep the spine neutral.'],
        instructionsPtBrAuto: ['Controle a fase excêntrica e mantenha a coluna neutra.'],
        imageUrls: ['https://cdn.vyta.app/exercises/rdl/1.jpg'],
        videoUrl: 'https://cdn.vyta.app/exercises/rdl/demo.mp4',
        sourceProvider: 'vyta',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.slug).toBe('romanian-deadlift');
    expect(createResponse.body.data.category).toBe('STRENGTH');
    expect(createResponse.body.data.primaryMuscles).toEqual(['HAMSTRINGS', 'GLUTES']);
    expect(createResponse.body.data.videoUrl).toBe('https://cdn.vyta.app/exercises/rdl/demo.mp4');

    const duplicateSlugResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library')
      .set(authHeader(trainer.accessToken))
      .send({
        name: 'RDL Variation',
        slug: 'romanian-deadlift',
        primaryMuscles: ['HAMSTRINGS'],
        instructionSteps: ['Duplicate slug should fail.'],
      });

    expect(duplicateSlugResponse.status).toBe(409);
    expect(duplicateSlugResponse.body.error.message).toBe('Exercise slug already exists');

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/exercises/library/${createResponse.body.data.id}`)
      .set(authHeader(trainer.accessToken))
      .send({
        version: createResponse.body.data.version,
        difficulty: 'ADVANCED',
        tags: ['posterior-chain', 'strength'],
        equipmentList: ['BARBELL', 'STRAPS'],
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.version).toBe(createResponse.body.data.version + 1);
    expect(updateResponse.body.data.difficulty).toBe('ADVANCED');
    expect(updateResponse.body.data.tags).toContain('posterior-chain');

    const staleUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/exercises/library/${createResponse.body.data.id}`)
      .set(authHeader(trainer.accessToken))
      .send({
        version: createResponse.body.data.version,
        difficulty: 'BEGINNER',
      });

    expect(staleUpdateResponse.status).toBe(409);
    expect(staleUpdateResponse.body.error.message).toBe('Exercise was updated by another process');

    await prisma.exerciseLibrary.create({
      data: {
        name: 'Lat Pulldown',
        slug: 'lat-pulldown',
        muscleGroup: 'Back',
        equipment: 'Machine',
        instructions: 'Pull towards the upper chest.',
        category: 'STRENGTH',
        bodyRegion: 'UPPER_BODY',
        difficulty: 'BEGINNER',
        primaryMuscles: ['LATS'],
        equipmentList: ['MACHINE'],
      },
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/exercises/library?search=dead&category=STRENGTH&bodyRegion=LOWER_BODY&primaryMuscle=HAMSTRINGS')
      .set(authHeader(student.accessToken));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].name).toBe('Romanian Deadlift');

    const autocompleteResponse = await request(app.getHttpServer())
      .get('/api/v1/exercises/library/autocomplete?q=roman&limit=5')
      .set(authHeader(student.accessToken));

    expect(autocompleteResponse.status).toBe(200);
    expect(autocompleteResponse.body.data[0]).toEqual(
      expect.objectContaining({
        slug: 'romanian-deadlift',
        name: 'Romanian Deadlift',
      }),
    );

    const filtersResponse = await request(app.getHttpServer())
      .get('/api/v1/exercises/library/filters/meta')
      .set(authHeader(student.accessToken));

    expect(filtersResponse.status).toBe(200);
    expect(filtersResponse.body.data.categories).toContain('STRENGTH');
    expect(filtersResponse.body.data.bodyRegions).toContain('LOWER_BODY');
    expect(filtersResponse.body.data.primaryMuscles).toContain('HAMSTRINGS');
    expect(filtersResponse.body.data.equipment).toContain('BARBELL');
    expect(filtersResponse.body.data.tags).toContain('posterior-chain');

    const forbiddenImportResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library/import')
      .set(authHeader(trainer.accessToken))
      .send({});

    expect(forbiddenImportResponse.status).toBe(403);

    const importResponse = await request(app.getHttpServer())
      .post('/api/v1/exercises/library/import')
      .set(authHeader(admin.accessToken))
      .send({});

    expect(importResponse.status).toBe(201);
    expect(importResponse.body.data.imported).toBeGreaterThan(800);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/exercises/library/${createResponse.body.data.id}`)
      .set(authHeader(student.accessToken));

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.slug).toBe('romanian-deadlift');
    expect(detailResponse.body.data.instructionsPtBrAuto.length).toBeGreaterThan(0);
    expect(detailResponse.body.data.primaryMuscles).toContain('HAMSTRINGS');
  });
});
