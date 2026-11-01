import { isValidIban, isValidSpanishTaxId, normalizeIban, normalizeTaxId } from './tax-id';

describe('isValidSpanishTaxId', () => {
  it.each(['12345678Z', 'X1234567L', 'B12345674', 'P1234567D', 'b-12.345.674'])(
    'acepta %s',
    (value) => expect(isValidSpanishTaxId(value)).toBe(true),
  );

  it.each(['12345678A', 'X1234567A', 'B12345675', 'P12345674', 'ABC', ''])('rechaza %s', (value) =>
    expect(isValidSpanishTaxId(value)).toBe(false),
  );

  it('normaliza espacios, puntos y guiones', () => {
    expect(normalizeTaxId(' b-12.345.674 ')).toBe('B12345674');
  });
});

describe('isValidIban', () => {
  it('acepta un IBAN español válido con o sin espacios', () => {
    expect(isValidIban('ES91 2100 0418 4502 0005 1332')).toBe(true);
    expect(isValidIban('es9121000418450200051332')).toBe(true);
  });

  it('rechaza un dígito de control incorrecto', () => {
    expect(isValidIban('ES9221000418450200051332')).toBe(false);
  });

  it('rechaza un IBAN español con longitud incorrecta', () => {
    expect(isValidIban('ES912100041845020005133')).toBe(false);
  });

  it('normaliza espacios y mayúsculas', () => {
    expect(normalizeIban('es91 2100 0418')).toBe('ES9121000418');
  });
});