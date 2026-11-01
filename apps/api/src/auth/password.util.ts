import { randomBytes, scryptSync } from 'node:crypto';

// Mismo formato que el resto de la API: "scrypt:<salt hex>:<clave derivada hex>".
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
