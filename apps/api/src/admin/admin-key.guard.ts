import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-admin-key'];

    const expected = process.env.ADMIN_KEY;
    if (!expected) throw new UnauthorizedException('ADMIN_KEY missing in env');

    if (!key || key !== expected) throw new UnauthorizedException('Invalid admin key');
    return true;
  }
}
