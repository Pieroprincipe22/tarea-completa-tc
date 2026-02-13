import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { DevUserDto } from './dto/dev-user.dto';
import { AdminKeyGuard } from './admin-key.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('dev-user')
  @UseGuards(AdminKeyGuard)
  devUser(@Body() dto: DevUserDto) {
    return this.admin.devUser(dto);
  }
}
