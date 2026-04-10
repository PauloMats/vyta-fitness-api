import { ValidationPipe, VersioningType } from '@nestjs/common';
import multipart from '@fastify/multipart';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

export const prisma = new PrismaClient();
let ipOctet = 10;

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

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

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 10 * 1024 * 1024,
    },
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.studentImportIssue.deleteMany(),
    prisma.studentImportExerciseMatch.deleteMany(),
    prisma.studentImportJob.deleteMany(),
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
  const testIp = nextTestIp();

  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .set('x-forwarded-for', testIp)
    .send(payload)
    .expect(201);
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('x-forwarded-for', testIp)
    .send({
      email: payload.email,
      password: payload.password,
    });

  return response.body.data as {
    user: { id: string };
    accessToken: string;
    refreshToken: string;
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function nextTestIp() {
  ipOctet = ipOctet >= 250 ? 10 : ipOctet + 1;
  return `10.0.0.${ipOctet}`;
}
