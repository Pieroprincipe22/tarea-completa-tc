import { IsIn } from 'class-validator';

export const INVOICE_STATUSES = [
  'DRAFT',
  'GENERATED',
  'SENT',
  'PAID',
  'CANCELLED',
] as const;

export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];

export class UpdateInvoiceStatusDto {
  @IsIn(INVOICE_STATUSES)
  status!: InvoiceStatusValue;
}