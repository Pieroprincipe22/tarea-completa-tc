import { findLibraryTemplate } from '../maintenance-templates/template-library';

/**
 * Las máquinas que ofrece el asistente de mantenimiento y la hoja de
 * revisión de partida de cada una. "category" es lo que se guarda en cada
 * equipo y lo que une los equipos con su plan.
 */

// Dónde suele estar: en cada habitación o en zonas concretas (cubierta…).
export type MachinePlacement = 'ROOMS' | 'ZONES';

export type CatalogMachine = {
  key: string;
  category: string;
  label: string;
  hint: string;
  placement: MachinePlacement;
  // Zona donde suele ir cuando no está en las habitaciones.
  defaultZone: string | null;
  // Plantilla de partida (template-library.ts) para su hoja de revisión.
  libraryKey: string;
};

export const ROOF_ZONE = 'Cubierta';

export const MACHINE_CATALOG: CatalogMachine[] = [
  {
    key: 'fancoil',
    category: 'Fancoil',
    label: 'Fancoil',
    hint: 'De agua, sin unidad exterior: de pared, cassette o conductos.',
    placement: 'ROOMS',
    defaultZone: null,
    libraryKey: 'fancoil',
  },
  {
    key: 'vrf-interior',
    category: 'Unidad interior VRF',
    label: 'Unidad interior VRF / MRV',
    hint: 'Cassette, conductos o mural de un sistema VRF.',
    placement: 'ROOMS',
    defaultZone: null,
    libraryKey: 'vrf-interior',
  },
  {
    key: 'vrf-exterior',
    category: 'Unidad exterior VRF',
    label: 'Unidad exterior VRF / MRV',
    hint: 'Las máquinas exteriores del sistema VRF.',
    placement: 'ZONES',
    defaultZone: ROOF_ZONE,
    libraryKey: 'vrf',
  },
  {
    key: 'split',
    category: 'Split',
    label: 'Split',
    hint: 'De gas, con su propia unidad exterior: se revisan las dos.',
    placement: 'ROOMS',
    defaultZone: null,
    libraryKey: 'split',
  },
  {
    key: 'enfriadora',
    category: 'Enfriadora',
    label: 'Enfriadora',
    hint: 'Produce el agua de los fancoils.',
    placement: 'ZONES',
    defaultZone: ROOF_ZONE,
    libraryKey: 'enfriadora',
  },
  {
    key: 'cuadro-electrico',
    category: 'Cuadro eléctrico',
    label: 'Cuadro eléctrico',
    hint: 'Cuadros eléctricos de la climatización.',
    placement: 'ZONES',
    defaultZone: 'Sala de máquinas',
    libraryKey: 'cuadro-electrico',
  },
];

// Zonas comunes típicas de un hotel. "ROOF" = la planta de encima de la última.
export type ZonePreset = { name: string; level: number | 'ROOF' };

export const ZONE_PRESETS: ZonePreset[] = [
  { name: 'Recepción', level: 0 },
  { name: 'Restaurante', level: 0 },
  { name: 'Cafetería', level: 0 },
  { name: 'Cocina', level: 0 },
  { name: 'Salón de eventos', level: 0 },
  { name: 'Gimnasio', level: 0 },
  { name: 'Spa', level: -1 },
  { name: 'Lavandería', level: -1 },
  { name: 'Sala de máquinas', level: -1 },
  { name: 'Aparcamiento', level: -1 },
  { name: ROOF_ZONE, level: 'ROOF' },
];

/** El catálogo con la hoja de partida de cada máquina, para la pantalla. */
export function catalogWithTemplates() {
  return MACHINE_CATALOG.map((machine) => {
    const source = findLibraryTemplate(machine.libraryKey);
    return {
      key: machine.key,
      category: machine.category,
      label: machine.label,
      hint: machine.hint,
      placement: machine.placement,
      defaultZone: machine.defaultZone,
      template: source
        ? {
            name: source.name,
            description: source.description,
            items: source.items.map((item) => ({
              section: item.section,
              label: item.label,
              type: item.type,
              required: item.required ?? false,
              unit: item.unit ?? null,
              minValue: item.minValue ?? null,
              maxValue: item.maxValue ?? null,
              helpText: item.helpText ?? null,
              options: item.options ? item.options.map((option) => ({ ...option })) : null,
            })),
          }
        : null,
    };
  });
}