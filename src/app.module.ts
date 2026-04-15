import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CommentsModule } from './comments/comments.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { envValidationSchema } from './config/env.schema';
import { ExercisesModule } from './exercises/exercises.module';
import { FeedModule } from './feed/feed.module';
import { FriendshipsModule } from './friendships/friendships.module';
import { HealthModule } from './health/health.module';
import { LikesModule } from './likes/likes.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StudentsModule } from './students/students.module';
import { StudentImportsModule } from './student-imports/student-imports.module';
import { SupportModule } from './support/support.module';
import { TrainerStudentsModule } from './trainer-students/trainer-students.module';
import { TrainersModule } from './trainers/trainers.module';
import { UsersModule } from './users/users.module';
import { WorkoutDaysModule } from './workout-days/workout-days.module';
import { WorkoutPlansModule } from './workout-plans/workout-plans.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';

function resolvePrettyTransport(nodeEnv?: string) {
  if (nodeEnv !== 'development') {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');
  } catch {
    return undefined;
  }

  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 5,
      },
    ]),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL', 'info'),
          transport: resolvePrettyTransport(configService.get<string>('NODE_ENV')),
          genReqId: () => randomUUID(),
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              origin: req.headers?.origin,
              userAgent: req.headers?.['user-agent'],
              remoteAddress: req.remoteAddress,
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.passwordHash',
              'req.body.refreshToken',
            ],
            censor: '[Redacted]',
          },
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    AssessmentsModule,
    UsersModule,
    TrainersModule,
    StudentsModule,
    StudentImportsModule,
    TrainerStudentsModule,
    WorkoutPlansModule,
    WorkoutDaysModule,
    ExercisesModule,
    WorkoutSessionsModule,
    FeedModule,
    CommentsModule,
    LikesModule,
    FriendshipsModule,
    NotificationsModule,
    MessagesModule,
    RealtimeModule,
    SupportModule,
    MediaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
