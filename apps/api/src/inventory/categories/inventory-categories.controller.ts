import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Tenant, TenantContext } from '../../common/tenant.decorator';
import { InventoryProductGuard } from '../inventory-product.guard';
import { CreateInventoryCategoryDto, UpdateInventoryCategoryDto } from './dto/category.dto';
import { InventoryCategoriesService } from './inventory-categories.service';

@Controller('inventory/categories')
@UseGuards(InventoryProductGuard, RolesGuard)
export class InventoryCategoriesController {
  constructor(private readonly categories: InventoryCategoriesService) {}

  @Get()
  list(@Tenant() t: TenantContext, @Query('includeInactive') includeInactive?: string) {
    return this.categories.list(t.companyId, includeInactive === 'true');
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Tenant() t: TenantContext, @Body() dto: CreateInventoryCategoryDto) {
    return this.categories.create(t.companyId, dto);
  }

  @Post('defaults')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  createDefaults(@Tenant() t: TenantContext) {
    return this.categories.createDefaults(t.companyId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCategoryDto,
  ) {
    return this.categories.update(t.companyId, id, dto);
  }
}
