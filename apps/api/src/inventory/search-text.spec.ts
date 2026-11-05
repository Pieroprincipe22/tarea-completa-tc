import { buildSearchText, normalizeForSearch } from './search-text';

describe('normalizeForSearch', () => {
  it('quita tildes, pasa a minúsculas y simplifica espacios', () => {
    expect(normalizeForSearch('  Válvula   de BOLA 1/2"  ')).toBe('valvula de bola 1/2"');
  });

  it('devuelve cadena vacía para null o undefined', () => {
    expect(normalizeForSearch(null)).toBe('');
    expect(normalizeForSearch(undefined)).toBe('');
  });
});

describe('buildSearchText', () => {
  it('junta nombre, referencia, marca y apodos ignorando los vacíos', () => {
    expect(buildSearchText(['Tubo de cobre 1/4"', 'CU-014', null, '', 'Cobre 6,35'])).toBe(
      'tubo de cobre 1/4" cu-014 cobre 6,35',
    );
  });
});
