import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { CreateMaintenanceTemplateDto } from './create-maintenance-template.dto';

// Junta los mensajes de error, también los de los puntos (errores anidados).
function collect(errors: ValidationError[]): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...collect(e.children ?? []),
  ]);
}

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateMaintenanceTemplateDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, messages: collect(errors) };
}

describe('CreateMaintenanceTemplateDto', () => {
  it('limpia espacios y convierte los textos vacíos en null', async () => {
    const { dto, messages } = await check({
      name: '  Mantenimiento VRF  ',
      category: '  ',
      items: [
        { label: ' Presión de alta ', type: 'NUMBER', unit: ' bar ', minValue: '', section: '' },
      ],
    });

    expect(messages).toEqual([]);
    expect(dto.name).toBe('Mantenimiento VRF');
    expect(dto.category).toBeNull();
    expect(dto.items[0]).toMatchObject({
      label: 'Presión de alta',
      unit: 'bar',
      minValue: null,
      section: null,
    });
  });

  it('explica en español lo que falta', async () => {
    const { messages } = await check({ name: '   ', items: [] });

    expect(messages).toEqual(
      expect.arrayContaining([
        'La plantilla necesita un nombre.',
        'La plantilla necesita al menos un punto.',
      ]),
    );
  });

  it('rechaza puntos sin nombre o de un tipo que no existe', async () => {
    const { messages } = await check({
      name: 'Revisión',
      items: [
        { label: '', type: 'CHECKLIST' },
        { label: 'Foto', type: 'VIDEO' },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining(['Cada punto necesita un nombre.', 'El tipo de punto no es válido.']),
    );
  });

  it('rechaza campos que no existen', async () => {
    const { messages } = await check({
      name: 'Revisión',
      companyId: 'otra-empresa',
      items: [{ label: 'A', type: 'TEXT' }],
    });

    expect(messages.length).toBeGreaterThan(0);
  });

  it('valida las opciones de un punto de tipo Estado', async () => {
    const { dto, messages } = await check({
      name: 'Fancoil',
      items: [
        {
          label: 'Desagüe',
          type: 'CHOICE',
          options: [
            { label: ' Bien ', result: 'OK' },
            { label: '', result: 'ISSUE' },
            { label: 'Raro', result: 'MAL' },
          ],
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        'Cada opción necesita un nombre.',
        'Cada opción tiene que ser Correcto, Incidencia o No aplica.',
      ]),
    );
    expect(dto.items[0].options?.[0].label).toBe('Bien');
  });

  it('no deja meter más de 10 opciones', async () => {
    const { messages } = await check({
      name: 'Fancoil',
      items: [
        {
          label: 'Estado',
          type: 'CHOICE',
          options: Array.from({ length: 11 }, (_, i) => ({ label: `Opción ${i}`, result: 'OK' })),
        },
      ],
    });

    expect(messages).toContain('Un punto no puede tener más de 10 opciones.');
  });
});