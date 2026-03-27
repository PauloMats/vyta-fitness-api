import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  const makeHost = () => {
    const reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const request = {
      id: 'req-123',
      url: '/api/v1/resource',
    };

    return {
      reply,
      request,
      host: {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => reply,
        }),
      } as any,
    };
  };

  const makeException = (code: string, meta?: Record<string, unknown>) =>
    ({
      code,
      meta,
    }) as Prisma.PrismaClientKnownRequestError;

  it('maps P2002 to conflict', () => {
    const filter = new PrismaExceptionFilter();
    const { host, reply } = makeHost();

    filter.catch(makeException('P2002', { target: ['email'] }), host);

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Unique constraint violated',
          details: expect.objectContaining({
            prismaCode: 'P2002',
          }),
        }),
      }),
    );
  });

  it('maps P2025 to not found', () => {
    const filter = new PrismaExceptionFilter();
    const { host, reply } = makeHost();

    filter.catch(makeException('P2025'), host);

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Resource not found',
          requestId: 'req-123',
          path: '/api/v1/resource',
        }),
      }),
    );
  });

  it('maps unknown Prisma errors to bad request', () => {
    const filter = new PrismaExceptionFilter();
    const { host, reply } = makeHost();

    filter.catch(makeException('P9999'), host);

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'P9999',
          message: 'Database request failed',
        }),
      }),
    );
  });
});
