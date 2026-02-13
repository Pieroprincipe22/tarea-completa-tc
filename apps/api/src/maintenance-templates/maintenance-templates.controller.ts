import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MaintenanceTemplatesService } from './maintenance-templates.service';
import { CreateMaintenanceTemplateDto } from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';

@Controller('maintenance-templates')
export class MaintenanceTemplatesController {
  constructor(private readonly service: MaintenanceTemplatesService) {}

  @Post()
  create(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateMaintenanceTemplateDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  findAll(
    @Headers('x-company-id') companyId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.service.findAll(companyId, includeArchived === 'true');
  }

  @Get(':id')
  findOne(@Headers('x-company-id') companyId: string, @Param('id') id: string) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceTemplateDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  archive(@Headers('x-company-id') companyId: string, @Param('id') id: string) {
    return this.service.archive(companyId, id);
  }
}
