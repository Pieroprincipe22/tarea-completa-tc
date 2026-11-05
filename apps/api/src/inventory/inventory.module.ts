import { Module } from '@nestjs/common';
import { InventoryActivationController } from './activation/inventory-activation.controller';
import { InventoryActivationService } from './activation/inventory-activation.service';
import { InventoryCategoriesController } from './categories/inventory-categories.controller';
import { InventoryCategoriesService } from './categories/inventory-categories.service';
import { InventoryProductGuard } from './inventory-product.guard';
import { InventoryLocationsController } from './locations/inventory-locations.controller';
import { InventoryLocationsService } from './locations/inventory-locations.service';

/** Inventorio: segundo programa de AnPi Tech. Plan en docs/inventario/PLAN.md. */
@Module({
  controllers: [
    InventoryActivationController,
    InventoryCategoriesController,
    InventoryLocationsController,
  ],
  providers: [
    InventoryProductGuard,
    InventoryActivationService,
    InventoryCategoriesService,
    InventoryLocationsService,
  ],
})
export class InventoryModule {}
