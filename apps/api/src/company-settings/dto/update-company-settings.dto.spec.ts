import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCompanySettingsDto } from './update-company-settings.dto';

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(UpdateCompanySettingsDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, messages: errors.flatMap((e) => Object.values(e.constraints ?? {})) };
}

describe('UpdateCompanySettingsDto', () => {
  it('normaliza NIF, IBAN y email', async () => {
    const { dto, messages } = await check({
      taxId: ' b-12.345.674 ',
      iban: 'es91 2100 0418 4502 0005 1332',
      email: ' Oficina@ClimaNorte.ES ',
    });
    expect(messages).toEqual([]);
    expect(dto.taxId).toBe('B12345674');
    expect(dto.iban).toBe('ES9121000418450200051332');
    expect(dto.email).toBe('oficina@climanorte.es');
  });

  it('convierte los campos vacíos en null para borrarlos', async () => {
    const { dto, messages } = await check({ phone: '   ', website: '' });
    expect(messages).toEqual([]);
    expect(dto.phone).toBeNull();
    expect(dto.website).toBeNull();
  });

  it('explica en español qué está mal', async () => {
    const { messages } = await check({ taxId: '12345678A', iban: 'ES0000', defaultTaxRate: 150 });
    expect(messages).toEqual(
      expect.arrayContaining([
        'El NIF/CIF no es válido. Revisa los números y la letra de control.',
        'El IBAN no es válido. Revisa que esté completo y bien copiado.',
        'El IVA no puede superar el 100 %.',
      ]),
    );
  });

  it('pasa los prefijos a mayúsculas y rechaza espacios o símbolos', async () => {
    const ok = await check({ workOrderPrefix: ' pt ', quotePrefix: 'pre26' });
    expect(ok.messages).toEqual([]);
    expect(ok.dto.workOrderPrefix).toBe('PT');
    expect(ok.dto.quotePrefix).toBe('PRE26');

    const bad = await check({ invoicePrefix: 'FAC 1', workOrderPrefix: 'DEMASIADOLARGO' });
    expect(bad.messages).toHaveLength(2);
  });

  it('rechaza campos que no existen', async () => {
    const { messages } = await check({ plan: 'ENTERPRISE' });
    expect(messages.length).toBeGreaterThan(0);
  });
});