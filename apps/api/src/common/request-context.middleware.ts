import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const method = req.method.toUpperCase();

    const isPublicRoute =
      (method === 'POST' && (path === '/auth/login' || path.endsWith('/auth/login'))) ||
      (method === 'POST' && (path === '/admin/dev-user' || path.endsWith('/admin/dev-user')));

    if (isPublicRoute) {
      return next();
    }

    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      throw new BadRequestException('Missing x-company-id or x-user-id');
    }

    next();
  }
}