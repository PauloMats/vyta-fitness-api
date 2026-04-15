import { TrainerStudentStatus } from '@prisma/client';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { authHeader, cleanDatabase, createTestApp, prisma, registerAndLogin } from './test-utils';

describe('Realtime SSE (e2e)', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server address');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it('streams notification and message invalidation events', async () => {
    const trainer = await registerAndLogin(app, {
      email: 'trainer-realtime@vyta.app',
      fullName: 'Trainer Realtime',
      password: 'Vyta@1234',
      role: 'TRAINER',
    });
    const student = await registerAndLogin(app, {
      email: 'student-realtime@vyta.app',
      fullName: 'Student Realtime',
      password: 'Vyta@1234',
      role: 'STUDENT',
    });

    await prisma.trainerStudent.create({
      data: {
        trainerId: trainer.user.id,
        studentId: student.user.id,
        status: TrainerStudentStatus.ACTIVE,
      },
    });

    const streamResponse = await fetch(
      `${baseUrl}/api/v1/realtime/stream?accessToken=${encodeURIComponent(trainer.accessToken)}&channels=notifications,messages`,
      {
        headers: {
          Accept: 'text/event-stream',
        },
      },
    );

    expect(streamResponse.ok).toBe(true);
    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream');
    const reader = streamResponse.body?.getReader();
    expect(reader).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(authHeader(student.accessToken))
      .send({
        recipientId: trainer.user.id,
        subject: 'SSE test',
        body: 'Mensagem para disparar stream',
      })
      .expect(201);

    const sseOutput = await readUntil(
      reader!,
      (text) =>
        text.includes('event: notifications.invalidate') &&
        text.includes('event: messages.invalidate'),
      5_000,
    );

    expect(sseOutput).toContain('event: connected');
    expect(sseOutput).toContain('event: notifications.invalidate');
    expect(sseOutput).toContain('event: messages.invalidate');
    expect(sseOutput).toContain('"reason":"created"');

    await reader!.cancel();
  });
});

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  matcher: (text: string) => boolean,
  timeoutMs: number,
) {
  const decoder = new TextDecoder();
  let output = '';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const chunk = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for SSE event')), 250),
      ),
    ]).catch((error) => {
      if (error instanceof Error && error.message === 'Timed out waiting for SSE event') {
        return null;
      }

      throw error;
    });

    if (!chunk) {
      continue;
    }

    if (chunk.done) {
      break;
    }

    output += decoder.decode(chunk.value, { stream: true });
    if (matcher(output)) {
      return output;
    }
  }

  throw new Error(`Expected SSE event not received. Output so far: ${output}`);
}
