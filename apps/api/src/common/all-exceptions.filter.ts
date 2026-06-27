import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Campos comunes a toda respuesta de error.
    const base = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    let body: Record<string, unknown>;

    if (isHttp) {
      const resp = exception.getResponse();
      // Conserva el mensaje original (validaciones, 401, 429, etc.).
      body =
        typeof resp === 'string'
          ? { ...base, message: resp }
          : { ...base, ...(resp as Record<string, unknown>) };
    } else {
      // Error inesperado: NO exponemos detalles internos al cliente.
      body = {
        ...base,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
    }

    // En el servidor sí registramos todo (con stack) para poder depurar.
    if (!isHttp || status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(body);
  }
}