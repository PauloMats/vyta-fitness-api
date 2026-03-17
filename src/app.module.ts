import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CommentsModule } from './comments/comments.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
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
import { PrismaModule } from './prisma/prisma.module';
import { StudentsModule } from './students/students.module';
import { TrainerStudentsModule } from './trainer-students/trainer-students.module';
import { TrainersModule } from './trainers/trainers.module';
import { UsersModule } from './users/users.module';
import { WorkoutDaysModule } from './workout-days/workout-days.module';
import { WorkoutPlansModule } from './workout-plans/workout-plans.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL', 'info'),
          genReqId: () => randomUUID(),
          redact: {
            paths: [
              'req.headers.authorization',
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
    UsersModule,
    TrainersModule,
    StudentsModule,
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
    MediaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
