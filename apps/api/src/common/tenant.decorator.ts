import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type TenantContext = {
  companyId: string;
  userId: string;
  role: string;
};

export const Tenant = createParamDecorator((_: unknown, ctx: ExecutionContext): TenantContext => {
  const req = ctx.switchToHttp().getRequest();
  return req.tenant as TenantContext;
});