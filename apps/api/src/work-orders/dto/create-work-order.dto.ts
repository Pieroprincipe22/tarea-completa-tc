import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  title!: string;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}