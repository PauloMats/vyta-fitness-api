import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const payload =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown> | null);

    reply.status(status).send({
      success: false,
      error: {
        statusCode: status,
        message: payload?.message ?? (exception instanceof Error ? exception.message : 'Internal server error'),
        code: payload?.error ?? (exception instanceof HttpException ? exception.name : 'InternalServerError'),
        details: payload && 'message' in payload ? payload : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
