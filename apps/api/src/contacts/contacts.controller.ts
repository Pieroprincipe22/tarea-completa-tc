import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantGuard } from '../common/tenant.guard';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactsService } from './contacts.service';

type AuthedRequest = Request & { companyId?: string };

@Controller('contacts')
@UseGuards(TenantGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateContactDto) {
    return this.contacts.create(req.companyId!, dto);
  }

  @Get()
  findAll(@Req() req: AuthedRequest, @Query('siteId') siteId?: string) {
    return this.contacts.findAll(req.companyId!, siteId);
  }
}
