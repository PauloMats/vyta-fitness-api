import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpStatus, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const mappedException = this.mapException(exception);
    const status = mappedException.getStatus();
    const response = mappedException.getResponse() as Record<string, unknown>;

    reply.status(status).send({
      success: false,
      error: {
        code: response.error ?? exception.code,
        message: response.message ?? 'Database request failed',
        details: {
          prismaCode: exception.code,
          meta: exception.meta,
        },
        requestId: request.id,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private mapException(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException('Unique constraint violated');
      case 'P2025':
        return new NotFoundException('Resource not found');
      default:
        return {
          getStatus: () => HttpStatus.BAD_REQUEST,
          getResponse: () => ({
            error: exception.code,
            message: 'Database request failed',
          }),
        };
    }
  }
}
