import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateContactDto) {
    return this.contacts.create(t.companyId, dto);
  }

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.contacts.list(t.companyId);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.contacts.get(t.companyId, id);
  }
}