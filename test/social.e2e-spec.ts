import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FriendshipStatus, PostVisibility, WorkoutSessionStatus } from '@prisma/client';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Social modules (e2e)', () => {
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

  it('handles friendships, feed visibility, comments, likes and notifications', async () => {
    const studentA = await registerAndLogin(app, {
      email: 'social.a@vyta.app',
      fullName: 'Social A',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });
    const studentB = await registerAndLogin(app, {
      email: 'social.b@vyta.app',
      fullName: 'Social B',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });
    const studentC = await registerAndLogin(app, {
      email: 'social.c@vyta.app',
      fullName: 'Social C',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    const friendshipRequestResponse = await request(app.getHttpServer())
      .post('/api/v1/friendships/request')
      .set(authHeader(studentA.accessToken))
      .send({
        addresseeId: studentB.user.id,
      });

    expect(friendshipRequestResponse.status).toBe(201);
    expect(friendshipRequestResponse.body.data.status).toBe('PENDING');

    const friendshipId = friendshipRequestResponse.body.data.id;

    const reverseDuplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/friendships/request')
      .set(authHeader(studentB.accessToken))
      .send({
        addresseeId: studentA.user.id,
      });

    expect(reverseDuplicateResponse.status).toBe(409);
    expect(reverseDuplicateResponse.body.error.message).toBe('Friendship already exists');

    const unrelatedUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/friendships/${friendshipId}/status`)
      .set(authHeader(studentC.accessToken))
      .send({
        status: FriendshipStatus.ACCEPTED,
      });

    expect(unrelatedUpdateResponse.status).toBe(403);

    const acceptedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/friendships/${friendshipId}/status`)
      .set(authHeader(studentB.accessToken))
      .send({
        status: FriendshipStatus.ACCEPTED,
      });

    expect(acceptedResponse.status).toBe(200);
    expect(acceptedResponse.body.data.status).toBe('ACCEPTED');

    const completedSession = await prisma.workoutSession.create({
      data: {
        userId: studentA.user.id,
        status: WorkoutSessionStatus.COMPLETED,
        startedAt: new Date('2026-03-20T09:00:00.000Z'),
        finishedAt: new Date('2026-03-20T10:00:00.000Z'),
        durationSeconds: 3600,
      },
    });

    const friendsPostResponse = await request(app.getHttpServer())
      .post('/api/v1/feed/posts')
      .set(authHeader(studentA.accessToken))
      .send({
        workoutSessionId: completedSession.id,
        caption: 'Treino pesado de perna.',
        visibility: PostVisibility.FRIENDS,
      });

    expect(friendsPostResponse.status).toBe(201);
    const friendsPostId = friendsPostResponse.body.data.id;

    const publicPostResponse = await request(app.getHttpServer())
      .post('/api/v1/feed/posts')
      .set(authHeader(studentA.accessToken))
      .send({
        caption: 'Check-in publico.',
        visibility: PostVisibility.PUBLIC,
      });

    expect(publicPostResponse.status).toBe(201);
    const publicPostId = publicPostResponse.body.data.id;

    const friendCanAccessResponse = await request(app.getHttpServer())
      .get(`/api/v1/feed/posts/${friendsPostId}`)
      .set(authHeader(studentB.accessToken));

    expect(friendCanAccessResponse.status).toBe(200);
    expect(friendCanAccessResponse.body.data.caption).toBe('Treino pesado de perna.');

    const strangerCannotAccessResponse = await request(app.getHttpServer())
      .get(`/api/v1/feed/posts/${friendsPostId}`)
      .set(authHeader(studentC.accessToken));

    expect(strangerCannotAccessResponse.status).toBe(403);

    const strangerFeedResponse = await request(app.getHttpServer())
      .get(`/api/v1/feed/posts?userId=${studentA.user.id}`)
      .set(authHeader(studentC.accessToken));

    expect(strangerFeedResponse.status).toBe(200);
    expect(strangerFeedResponse.body.data).toHaveLength(1);
    expect(strangerFeedResponse.body.data[0].id).toBe(publicPostId);

    const friendFeedResponse = await request(app.getHttpServer())
      .get(`/api/v1/feed/posts?userId=${studentA.user.id}`)
      .set(authHeader(studentB.accessToken));

    expect(friendFeedResponse.status).toBe(200);
    expect(friendFeedResponse.body.data).toHaveLength(2);

    const likeResponse = await request(app.getHttpServer())
      .post(`/api/v1/feed/posts/${publicPostId}/likes`)
      .set(authHeader(studentC.accessToken));

    expect(likeResponse.status).toBe(201);

    const duplicateLikeResponse = await request(app.getHttpServer())
      .post(`/api/v1/feed/posts/${publicPostId}/likes`)
      .set(authHeader(studentC.accessToken));

    expect(duplicateLikeResponse.status).toBe(409);
    expect(duplicateLikeResponse.body.error.message).toBe('Like already exists');

    const commentResponse = await request(app.getHttpServer())
      .post(`/api/v1/feed/posts/${friendsPostId}/comments`)
      .set(authHeader(studentB.accessToken))
      .send({
        text: 'Mandou muito bem nesse treino.',
      });

    expect(commentResponse.status).toBe(201);
    const commentId = commentResponse.body.data.id;

    const forbiddenCommentDeleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/comments/${commentId}`)
      .set(authHeader(studentC.accessToken));

    expect(forbiddenCommentDeleteResponse.status).toBe(403);

    const deleteLikeResponse = await request(app.getHttpServer())
      .delete(`/api/v1/feed/posts/${publicPostId}/likes`)
      .set(authHeader(studentC.accessToken));

    expect(deleteLikeResponse.status).toBe(200);
    expect(deleteLikeResponse.body.data.message).toBe('Like removed successfully');

    const deleteCommentResponse = await request(app.getHttpServer())
      .delete(`/api/v1/comments/${commentId}`)
      .set(authHeader(studentB.accessToken));

    expect(deleteCommentResponse.status).toBe(200);
    expect(deleteCommentResponse.body.data.message).toBe('Comment deleted successfully');

    const notificationsForBResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=true')
      .set(authHeader(studentB.accessToken));

    expect(notificationsForBResponse.status).toBe(200);
    expect(notificationsForBResponse.body.data.some((item: { type: string }) => item.type === 'FRIEND_REQUEST')).toBe(
      true,
    );

    const firstNotificationId = notificationsForBResponse.body.data[0].id;
    const readNotificationResponse = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${firstNotificationId}/read`)
      .set(authHeader(studentB.accessToken));

    expect(readNotificationResponse.status).toBe(200);
    expect(readNotificationResponse.body.data.readAt).toBeTruthy();

    const notificationsForAResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=true')
      .set(authHeader(studentA.accessToken));

    expect(notificationsForAResponse.status).toBe(200);
    expect(notificationsForAResponse.body.data.some((item: { type: string }) => item.type === 'POST_LIKE')).toBe(true);
    expect(notificationsForAResponse.body.data.some((item: { type: string }) => item.type === 'POST_COMMENT')).toBe(
      true,
    );

    const readAllResponse = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set(authHeader(studentA.accessToken));

    expect(readAllResponse.status).toBe(200);
    expect(readAllResponse.body.data.updated).toBeGreaterThanOrEqual(2);

    const removePostResponse = await request(app.getHttpServer())
      .delete(`/api/v1/feed/posts/${publicPostId}`)
      .set(authHeader(studentA.accessToken));

    expect(removePostResponse.status).toBe(200);
    expect(removePostResponse.body.data.message).toBe('Post deleted successfully');
  });
});
