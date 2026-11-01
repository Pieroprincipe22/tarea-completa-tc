import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { logoUploadOptions } from '../common/file-upload';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

// Datos de la empresa del usuario que hace la petición.
// La empresa sale siempre del tenant (sesión), nunca de un parámetro de la URL.
@Controller('company-settings')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CompanySettingsController {
  constructor(private readonly settings: CompanySettingsService) {}

  @Get()
  get(@Tenant() t: TenantContext) {
    return this.settings.get(t.companyId);
  }

  @Patch()
  update(@Tenant() t: TenantContext, @Body() dto: UpdateCompanySettingsDto) {
    return this.settings.update(t.companyId, dto);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file', logoUploadOptions))
  uploadLogo(@Tenant() t: TenantContext, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.settings.uploadLogo(t.companyId, file);
  }

  @Delete('logo')
  removeLogo(@Tenant() t: TenantContext) {
    return this.settings.removeLogo(t.companyId);
  }
}