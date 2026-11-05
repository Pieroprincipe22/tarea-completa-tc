/**
 * Texto normalizado para buscar piezas: minúsculas, sin tildes y con los
 * espacios simplificados. "Válvula de bola 1/2\"" → "valvula de bola 1/2\"".
 */
export function normalizeForSearch(value: string | null | undefined): string {
  if (!value) return '';

  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Junta nombre, referencia, marca y apodos de una pieza en el texto que se
 * guarda en InventoryPart.searchText (sin repetir palabras sueltas vacías).
 */
export function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => normalizeForSearch(part))
    .filter((part) => part.length > 0)
    .join(' ');
}
