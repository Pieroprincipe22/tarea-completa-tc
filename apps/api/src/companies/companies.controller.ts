import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  // Alta de empresas = operación de plataforma. Solo SUPER_ADMIN.
  // (El alta self-service de prueba irá en un endpoint público aparte, Fase 4.)
  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }

  // Listar TODAS las empresas del sistema = solo SUPER_ADMIN.
  @Get()
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.companies.findAll();
  }

  // Un usuario solo puede consultar SUS propias empresas (salvo SUPER_ADMIN).
  @Get('by-user/:userId')
  findByUser(@Tenant() t: TenantContext, @Param('userId') userId: string) {
    if (t.role !== 'SUPER_ADMIN' && userId !== t.userId) {
      throw new ForbiddenException('No puedes consultar empresas de otro usuario.');
    }

    return this.companies.findByUser(userId);
  }

  // Solo puedes ver la empresa a la que perteneces (salvo SUPER_ADMIN).
  @Get(':id')
  findOne(@Tenant() t: TenantContext, @Param('id') id: string) {
    if (t.role !== 'SUPER_ADMIN' && id !== t.companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa.');
    }

    return this.companies.findOne(id);
  }
}