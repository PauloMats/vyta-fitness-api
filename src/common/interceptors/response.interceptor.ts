import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
          return data;
        }

        if (data && typeof data === 'object' && 'items' in (data as Record<string, unknown>) && 'meta' in (data as Record<string, unknown>)) {
          const paginated = data as { items: unknown; meta: unknown };
          return { success: true, data: paginated.items, meta: paginated.meta };
        }

        return { success: true, data };
      }),
    );
  }
}
