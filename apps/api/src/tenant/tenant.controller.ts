import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TenantGuard } from '../common/tenant.guard';

type AuthedRequest = Request & {
  userId?: string;
  companyId?: string;
  role?: string;
};

@Controller('tenant')
export class TenantController {
  @UseGuards(TenantGuard)
  @Get('ping')
  ping(@Req() req: AuthedRequest) {
    return {
      ok: true,
      userId: req.userId,
      companyId: req.companyId,
      role: req.role,
    };
  }
}
