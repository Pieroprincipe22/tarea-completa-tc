import { IsEnum } from 'class-validator';

export const workOrderStatusValues = [
  'OPEN',
  'ASSIGNED',
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;

export type WorkOrderStatusValue = (typeof workOrderStatusValues)[number];

export class UpdateWorkOrderStatusDto {
  @IsEnum(workOrderStatusValues)
  status!: WorkOrderStatusValue;
}
