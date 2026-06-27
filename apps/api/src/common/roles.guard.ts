import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lee el "cartel" puesto por @Roles(), tanto a nivel de método como de controller.
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no exige ningún rol, este guard no opina (deja pasar).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const role = req.tenant?.role;

    // Sin tenant resuelto (p. ej. el TenantGuard no corrió) = no pasa.
    if (!role) {
      throw new ForbiddenException('No se pudo determinar el rol del usuario.');
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }

    return true;
  }
}