import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';

type RequestWithUser = {
  companyId?: string;
  userId?: string;
  role?: string;
  user?: {
    id?: string;
    userId?: string;
    companyId?: string;
    activeCompanyId?: string;
    company?: {
      id?: string;
    };
    role?: string;
  };
  headers?: {
    [key: string]: string | string[] | undefined;
  };
};

type CompanyUserListQuery = {
  role?: string;
  search?: string;
  active?: string;
  page?: number | string;
  pageSize?: number | string;
};

@Controller('company-users')
export class CompanyUsersController {
  constructor(private readonly companyUsers: CompanyUsersService) {}

  private getHeaderValue(
    req: RequestWithUser,
    headerName: string,
  ): string | undefined {
    const value = req.headers?.[headerName];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private getCompanyId(req: RequestWithUser): string {
    const companyId =
      req.companyId ??
      req.user?.companyId ??
      req.user?.activeCompanyId ??
      req.user?.company?.id ??
      this.getHeaderValue(req, 'x-company-id');

    if (!companyId) {
      throw new BadRequestException(
        'No se pudo resolver la empresa activa para gestionar usuarios',
      );
    }

    return companyId;
  }

  private getCurrentRole(req: RequestWithUser): string | undefined {
    return (
      req.role ??
      req.user?.role ??
      this.getHeaderValue(req, 'x-user-role') ??
      this.getHeaderValue(req, 'x-role')
    );
  }

  private assertCanManageCompanyUsers(req: RequestWithUser) {
    const role = this.getCurrentRole(req);

    /**
     * Compatibilidad:
     * - En desarrollo puede que el role no venga en headers.
     * - Si viene, solo ADMIN o SUPER_ADMIN pueden gestionar usuarios.
     */
    if (!role) {
      return;
    }

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new BadRequestException(
        'No tienes permisos para gestionar usuarios de empresa',
      );
    }
  }

  @Get()
  list(@Req() req: RequestWithUser, @Query() query: CompanyUserListQuery) {
    this.assertCanManageCompanyUsers(req);

    const companyId = this.getCompanyId(req);

    return this.companyUsers.list(companyId, query);
  }

  @Get(':id')
  get(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertCanManageCompanyUsers(req);

    const companyId = this.getCompanyId(req);

    return this.companyUsers.get(companyId, id);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateCompanyUserDto) {
    this.assertCanManageCompanyUsers(req);

    const companyId = this.getCompanyId(req);

    return this.companyUsers.create(companyId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserDto,
  ) {
    this.assertCanManageCompanyUsers(req);

    const companyId = this.getCompanyId(req);

    return this.companyUsers.update(companyId, id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertCanManageCompanyUsers(req);

    const companyId = this.getCompanyId(req);

    return this.companyUsers.deactivate(companyId, id);
  }

  @Patch(':id/activate')
  activate(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertCanManageCompanyUsers(req);

    const companyId = this.getCompanyId(req);

    return this.companyUsers.activate(companyId, id);
  }
}