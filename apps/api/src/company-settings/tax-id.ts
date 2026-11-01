// Validaciones de identificadores españoles y de cuentas bancarias.
// Funciones puras: se pueden probar sin base de datos.

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';

/** Quita espacios, puntos y guiones y pasa a mayúsculas: "b-12.345.674" → "B12345674". */
export function normalizeTaxId(value: string): string {
  return value.replace(/[\s.-]/g, '').toUpperCase();
}

function isValidNif(value: string): boolean {
  const match = /^(\d{8})([A-Z])$/.exec(value);
  if (!match) return false;
  return NIF_LETTERS[Number(match[1]) % 23] === match[2];
}

function isValidNie(value: string): boolean {
  const match = /^([XYZ])(\d{7})([A-Z])$/.exec(value);
  if (!match) return false;
  const prefix = { X: '0', Y: '1', Z: '2' }[match[1] as 'X' | 'Y' | 'Z'];
  return NIF_LETTERS[Number(prefix + match[2]) % 23] === match[3];
}

function isValidCif(value: string): boolean {
  const match = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(value);
  if (!match) return false;

  const [, type, digits, control] = match;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const n = Number(digits[i]);
    if (i % 2 === 0) {
      // Posiciones impares (1ª, 3ª…): se dobla y se suman sus cifras.
      const doubled = n * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += n;
    }
  }

  const digit = (10 - (sum % 10)) % 10;
  const letter = CIF_CONTROL_LETTERS[digit];

  // Unos tipos de sociedad llevan letra de control, otros número, el resto cualquiera.
  if ('PQRSNW'.includes(type)) return control === letter;
  if ('ABEH'.includes(type)) return control === String(digit);
  return control === letter || control === String(digit);
}

/** NIF (personas), NIE (extranjeros) o CIF (sociedades) con su dígito de control. */
export function isValidSpanishTaxId(raw: string): boolean {
  const value = normalizeTaxId(raw);
  return isValidNif(value) || isValidNie(value) || isValidCif(value);
}

/** Quita espacios y pasa a mayúsculas: "es91 2100 ..." → "ES912100...". */
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** IBAN de cualquier país, comprobado con el algoritmo módulo 97 (ISO 13616). */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith('ES') && iban.length !== 24) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    const chunk = code >= 65 ? String(code - 55) : char; // A=10 … Z=35
    for (const d of chunk) {
      remainder = (remainder * 10 + Number(d)) % 97;
    }
  }
  return remainder === 1;
}