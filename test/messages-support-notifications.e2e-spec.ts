import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Messages, Support and Notifications (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports direct messages, notifications and support tickets', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer.msg@vyta.app',
      fullName: 'Trainer Msg',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });
    const student = await registerAndLogin(app, {
      email: 'student.msg@vyta.app',
      fullName: 'Student Msg',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const adminPassword = 'Vyta@1234';
    const adminPasswordHash = await argon2.hash(adminPassword);
    await prisma.user.create({
      data: {
        email: 'admin.support@vyta.app',
        fullName: 'Admin Support',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
      },
    });
    const adminLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'admin.support@vyta.app',
      password: adminPassword,
    });
    const admin = adminLogin.body.data as { accessToken: string };

    await prisma.trainerStudent.create({
      data: {
        trainerId: trainer.user.id,
        studentId: student.user.id,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    const studentMessage = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(authHeader(student.accessToken))
      .send({
        recipientId: trainer.user.id,
        category: 'TRAINING',
        subject: 'Dúvida treino',
        body: 'Posso trocar o agachamento por leg press hoje?',
      });

    expect(studentMessage.status).toBe(201);
    expect(studentMessage.body.data.senderId).toBe(student.user.id);
    expect(studentMessage.body.data.recipientId).toBe(trainer.user.id);

    const trainerInbox = await request(app.getHttpServer())
      .get('/api/v1/messages/inbox')
      .set(authHeader(trainer.accessToken));

    expect(trainerInbox.status).toBe(200);
    expect(trainerInbox.body.data).toHaveLength(1);
    expect(trainerInbox.body.meta.unreadCount).toBe(1);

    const trainerNotifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(trainer.accessToken));

    expect(trainerNotifications.status).toBe(200);
    expect(trainerNotifications.body.meta.unreadCount).toBe(1);
    expect(trainerNotifications.body.data[0].type).toBe('MESSAGE');

    const readNotification = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${trainerNotifications.body.data[0].id}/read`)
      .set(authHeader(trainer.accessToken));

    expect(readNotification.status).toBe(200);
    expect(readNotification.body.data.readAt).toBeTruthy();

    const trainerMessage = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(authHeader(trainer.accessToken))
      .send({
        recipientId: student.user.id,
        category: 'ASSESSMENT',
        subject: 'Avaliação',
        body: 'Vamos marcar sua nova avaliação para sexta-feira.',
      });

    expect(trainerMessage.status).toBe(201);

    const studentInbox = await request(app.getHttpServer())
      .get('/api/v1/messages/inbox')
      .set(authHeader(student.accessToken));

    expect(studentInbox.status).toBe(200);
    expect(studentInbox.body.data).toHaveLength(1);

    const readMessage = await request(app.getHttpServer())
      .patch(`/api/v1/messages/${trainerMessage.body.data.id}/read`)
      .set(authHeader(student.accessToken));

    expect(readMessage.status).toBe(200);
    expect(readMessage.body.data.readAt).toBeTruthy();

    const createTicket = await request(app.getHttpServer())
      .post('/api/v1/support/tickets')
      .set(authHeader(trainer.accessToken))
      .send({
        category: 'QUESTIONS',
        subject: 'Importação de aluno',
        message: 'Preciso de ajuda para importar um aluno de outra plataforma.',
      });

    expect(createTicket.status).toBe(201);
    expect(createTicket.body.data.status).toBe('OPEN');

    const myTickets = await request(app.getHttpServer())
      .get('/api/v1/support/tickets/me')
      .set(authHeader(trainer.accessToken));

    expect(myTickets.status).toBe(200);
    expect(myTickets.body.data).toHaveLength(1);

    const adminNotifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(admin.accessToken));

    expect(adminNotifications.status).toBe(200);
    expect(adminNotifications.body.data[0].type).toBe('SUPPORT');

    const updateTicket = await request(app.getHttpServer())
      .patch(`/api/v1/support/tickets/${createTicket.body.data.id}/status`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'IN_PROGRESS' });

    expect(updateTicket.status).toBe(200);
    expect(updateTicket.body.data.status).toBe('IN_PROGRESS');
  });
});
