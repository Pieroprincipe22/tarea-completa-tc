import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

function readHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === 'string' ? v : undefined;
}

// Comparación de tiempo constante. Hasheamos ambos valores a 32 bytes para que
// timingSafeEqual reciba buffers de igual longitud y no filtre la longitud real.
function safeEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest();
  const bh = createHash('sha256').update(b).digest();
  return timingSafeEqual(ah, bh);
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const key = readHeader(req, 'x-admin-key');
    const expected = process.env.ADMIN_KEY;

    if (!expected) throw new UnauthorizedException('ADMIN_KEY missing in env');
    if (!key || !safeEqual(key, expected)) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}