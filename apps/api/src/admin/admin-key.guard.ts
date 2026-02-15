import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

function readHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === 'string' ? v : undefined;
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const key = readHeader(req, 'x-admin-key');
    const expected = process.env.ADMIN_KEY;

    if (!expected) throw new UnauthorizedException('ADMIN_KEY missing in env');
    if (!key || key !== expected)
      throw new UnauthorizedException('Invalid admin key');

    return true;
  }
}
