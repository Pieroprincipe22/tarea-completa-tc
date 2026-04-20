import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TenantGuard } from '../common/tenant.guard';

type AuthedRequest = Request & {
  tenant?: {
    companyId: string;
    companyName: string;
    userId: string;
    role: string;
    email: string | null;
    name: string | null;
  };
};

@Controller('tenant')
export class TenantController {
  @UseGuards(TenantGuard)
  @Get('ping')
  ping(@Req() req: AuthedRequest) {
    return {
      ok: true,
      userId: req.tenant?.userId ?? null,
      companyId: req.tenant?.companyId ?? null,
      companyName: req.tenant?.companyName ?? null,
      role: req.tenant?.role ?? null,
      email: req.tenant?.email ?? null,
      name: req.tenant?.name ?? null,
    };
  }
}