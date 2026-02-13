import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { MaintenanceReportItemStatus } from '@prisma/client';

class UpdateMaintenanceReportItemPatchDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsEnum(MaintenanceReportItemStatus)
  status?: MaintenanceReportItemStatus;

  @IsOptional()
  @IsString()
  resultNotes?: string;

  @IsOptional()
  @IsString()
  resultValue?: string;
}

export class UpdateMaintenanceReportItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMaintenanceReportItemPatchDto)
  items!: UpdateMaintenanceReportItemPatchDto[];
}
