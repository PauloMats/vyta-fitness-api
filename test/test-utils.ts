import { ValidationPipe, VersioningType } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

export const prisma = new PrismaClient();

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    bufferLogs: false,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.postLike.deleteMany(),
    prisma.post.deleteMany(),
    prisma.assessmentReport.deleteMany(),
    prisma.assessmentPhoto.deleteMany(),
    prisma.assessmentFitnessTest.deleteMany(),
    prisma.assessmentBodyComposition.deleteMany(),
    prisma.assessmentSkinfold.deleteMany(),
    prisma.assessmentCircumference.deleteMany(),
    prisma.assessmentVitals.deleteMany(),
    prisma.assessmentAnamnesis.deleteMany(),
    prisma.assessmentScreening.deleteMany(),
    prisma.physicalAssessment.deleteMany(),
    prisma.workoutSet.deleteMany(),
    prisma.workoutSession.deleteMany(),
    prisma.workoutExercise.deleteMany(),
    prisma.workoutDay.deleteMany(),
    prisma.workoutPlan.deleteMany(),
    prisma.exerciseLibrary.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.friendship.deleteMany(),
    prisma.trainerStudent.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.trainerProfile.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function registerAndLogin(
  app: NestFastifyApplication,
  payload: {
    email: string;
    fullName: string;
    password: string;
    role?: 'TRAINER' | 'STUDENT';
  },
) {
  await request(app.getHttpServer()).post('/api/v1/auth/register').send(payload).expect(201);
  const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
    email: payload.email,
    password: payload.password,
  });

  return response.body.data as {
    user: { id: string };
    accessToken: string;
    refreshToken: string;
  };
}
