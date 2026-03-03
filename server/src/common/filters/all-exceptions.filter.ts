import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  code: string;
  message: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number;
    let body: ErrorBody;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const raw = exception.getResponse();

      if (typeof raw === 'string') {
        body = { code: this.statusToCode(status), message: raw };
      } else {
        const r = raw as Record<string, unknown>;
        // class-validator errors arrive as string[]
        const msg = Array.isArray(r['message'])
          ? String((r['message'] as string[])[0])
          : String(r['message'] ?? 'Bad request');
        body = { code: String(r['error'] ?? this.statusToCode(status)), message: msg };
      }
    } else {
      // Unexpected error — log full details, return generic message to client
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status}`, body.message);
    }

    res.status(status).json(body);
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
