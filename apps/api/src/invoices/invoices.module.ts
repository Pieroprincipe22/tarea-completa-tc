import { Module } from '@nestjs/common';
import { NumberingModule } from '../numbering/numbering.module';
import { StorageModule } from '../storage/storage.module';
import { PdfModule } from '../pdf/pdf.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [StorageModule, PdfModule, NumberingModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}