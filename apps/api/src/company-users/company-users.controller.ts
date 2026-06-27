import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

type CompanyUserListQuery = {
  role?: string;
  search?: string;
  active?: string;
  page?: number | string;
  pageSize?: number | string;
};

@Controller('company-users')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CompanyUsersController {
  constructor(private readonly companyUsers: CompanyUsersService) {}

  @Get()
  list(@Tenant() t: TenantContext, @Query() query: CompanyUserListQuery) {
    return this.companyUsers.list(t.companyId, query);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.companyUsers.get(t.companyId, id);
  }

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateCompanyUserDto) {
    return this.companyUsers.create(t.companyId, dto);
  }

  @Patch(':id')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserDto,
  ) {
    return this.companyUsers.update(t.companyId, id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.companyUsers.deactivate(t.companyId, id);
  }

  @Patch(':id/activate')
  activate(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.companyUsers.activate(t.companyId, id);
  }
}