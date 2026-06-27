import { SetMetadata } from '@nestjs/common';

export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'TECHNICIAN';

export const ROLES_KEY = 'tc_required_roles';

/**
 * Marca un endpoint (o un controller entero) con los roles permitidos.
 * Ej: @Roles('ADMIN', 'SUPER_ADMIN')
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);