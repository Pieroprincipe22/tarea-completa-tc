import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { AdminKeyGuard } from './admin-key.guard';
import { AdminService } from './admin.service';
import { DevUserDto } from './dto/dev-user.dto';

type DevUserResponse = {
  ok: true;
  companyId: string;
  userId: string;
  role: string;
};

@Public()
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @UseGuards(AdminKeyGuard)
  @Post('dev-user')
  async devUser(@Body() dto: DevUserDto): Promise<DevUserResponse> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    return this.admin.devUser(dto);
  }
}
