import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Tenant, TenantContext } from '../../common/tenant.decorator';
import { ActivateInventoryDto } from './dto/activate-inventory.dto';
import { InventoryActivationService } from './inventory-activation.service';

/**
 * Sin InventoryProductGuard a propósito: la app necesita saber si
 * Inventorio está activo antes de poder usarlo.
 */
@Controller('inventory')
@UseGuards(RolesGuard)
export class InventoryActivationController {
  constructor(private readonly activation: InventoryActivationService) {}

  @Get('status')
  status(@Tenant() t: TenantContext) {
    return this.activation.status(t.companyId, t.role);
  }

  @Post('activation')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  activate(@Tenant() t: TenantContext, @Body() dto: ActivateInventoryDto) {
    return this.activation.activate(t.companyId, dto.plan);
  }

  @Delete('activation')
  @Roles('SUPER_ADMIN')
  deactivate(@Tenant() t: TenantContext) {
    return this.activation.deactivate(t.companyId);
  }
}
