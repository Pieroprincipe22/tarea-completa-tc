import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NumberingService, type NextNumbers } from '../numbering/numbering.service';
import { StorageService } from '../storage/storage.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

const SETTINGS_SELECT = {
  id: true,
  name: true,
  legalName: true,
  taxId: true,
  addressLine: true,
  postalCode: true,
  city: true,
  province: true,
  country: true,
  phone: true,
  email: true,
  website: true,
  iban: true,
  defaultTaxRate: true,
  workOrderPrefix: true,
  quotePrefix: true,
  invoicePrefix: true,
  logoKey: true,
} satisfies Prisma.CompanySelect;

type CompanySettingsRow = Prisma.CompanyGetPayload<{ select: typeof SETTINGS_SELECT }>;

// Campos de texto que el administrador puede cambiar (o borrar enviándolos vacíos).
const TEXT_FIELDS = [
  'legalName',
  'taxId',
  'addressLine',
  'postalCode',
  'city',
  'province',
  'country',
  'phone',
  'email',
  'website',
  'iban',
] as const;

// Prefijos de numeración: se pueden cambiar pero no dejar vacíos.
const PREFIX_FIELDS = ['workOrderPrefix', 'quotePrefix', 'invoicePrefix'] as const;

export type CompanySettingsView = Omit<CompanySettingsRow, 'logoKey' | 'defaultTaxRate'> & {
  defaultTaxRate: number;
  logoUrl: string | null;
  // Número que llevará el próximo documento de cada tipo este año.
  numbering: NextNumbers;
};

const LOGO_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Comprueba la firma real del archivo: el tipo que manda el navegador
 * se puede falsear, los primeros bytes no.
 */
function sniffImageType(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly numbering: NumberingService,
  ) {}

  async get(companyId: string): Promise<CompanySettingsView> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: SETTINGS_SELECT,
    });

    if (!company) throw new NotFoundException('Empresa no encontrada.');
    return this.toView(company);
  }

  async update(companyId: string, dto: UpdateCompanySettingsDto): Promise<CompanySettingsView> {
    const data: Prisma.CompanyUpdateInput = {};

    for (const field of TEXT_FIELDS) {
      const value = dto[field];
      if (value !== undefined) data[field] = value;
    }

    if (typeof dto.defaultTaxRate === 'number') {
      data.defaultTaxRate = dto.defaultTaxRate;
    }

    for (const field of PREFIX_FIELDS) {
      const value = dto[field];
      if (typeof value === 'string') data[field] = value;
    }

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data,
      select: SETTINGS_SELECT,
    });

    return this.toView(company);
  }

  async uploadLogo(
    companyId: string,
    file: Express.Multer.File | undefined,
  ): Promise<CompanySettingsView> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta el archivo del logo.');
    }

    const realType = sniffImageType(file.buffer);
    const extension = realType ? LOGO_EXTENSIONS[realType] : undefined;
    if (!realType || !extension) {
      throw new BadRequestException('El logo tiene que ser una imagen PNG, JPG o WEBP.');
    }

    const key = `companies/${companyId}/branding/logo-${Date.now()}.${extension}`;
    await this.storage.putObject(key, file.buffer, realType);

    const previous = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { logoKey: true },
    });

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: { logoKey: key },
      select: SETTINGS_SELECT,
    });

    if (previous?.logoKey && previous.logoKey !== key) {
      await this.deleteQuietly(previous.logoKey);
    }

    return this.toView(company);
  }

  async removeLogo(companyId: string): Promise<CompanySettingsView> {
    const previous = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { logoKey: true },
    });

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: { logoKey: null },
      select: SETTINGS_SELECT,
    });

    if (previous?.logoKey) await this.deleteQuietly(previous.logoKey);
    return this.toView(company);
  }

  // Un logo viejo que no se pudo borrar no debe romper la petición del usuario.
  private async deleteQuietly(key: string) {
    try {
      await this.storage.deleteObject(key);
    } catch (err) {
      this.logger.warn(
        `No se pudo borrar el logo anterior (${key}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async toView(company: CompanySettingsRow): Promise<CompanySettingsView> {
    const { logoKey, defaultTaxRate, ...rest } = company;
    return {
      ...rest,
      defaultTaxRate: defaultTaxRate.toNumber(),
      logoUrl: logoKey ? await this.storage.getSignedUrl(logoKey) : null,
      numbering: await this.numbering.preview(company.id),
    };
  }
}