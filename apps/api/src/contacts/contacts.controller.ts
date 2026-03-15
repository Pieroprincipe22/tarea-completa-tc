import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  create(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contacts.create(companyId, dto);
  }

  @Get()
  list(@Headers('x-company-id') companyId: string) {
    return this.contacts.list(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
  ) {
    return this.contacts.get(companyId, id);
  }
}