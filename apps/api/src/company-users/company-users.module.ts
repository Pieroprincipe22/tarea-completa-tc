import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { CompanyUsersController } from './company-users.controller';
import { CompanyUsersService } from './company-users.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyUsersController],
  providers: [CompanyUsersService],
})
export class CompanyUsersModule {}