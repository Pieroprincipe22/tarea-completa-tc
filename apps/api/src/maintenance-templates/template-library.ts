import type { TemplateItemOption, TemplateItemType } from './template-item-types';

/**
 * Plantillas de partida: hojas de mantenimiento ya preparadas que una
 * empresa puede copiar y adaptar. Al copiarlas pasan a ser suyas; si
 * aquí se cambia algo después, sus copias no cambian.
 *
 * Los rangos solo se ponen cuando son valores de referencia generales
 * (tensión de red, aislamiento, tiempo de disparo de un diferencial).
 * Lo que depende de cada equipo (presiones, temperaturas, consumos) se
 * deja sin rango para que cada empresa ponga el del fabricante.
 */

export type LibraryItem = {
  section: string;
  label: string;
  type: TemplateItemType;
  required?: boolean;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  helpText?: string;
  options?: TemplateItemOption[];
};

export type LibraryTemplate = {
  key: string;
  name: string;
  category: string;
  description: string;
  items: LibraryItem[];
};

// Para lo que el técnico hace: limpiar, comprobar, reapretar…
export const TASK_OPTIONS: TemplateItemOption[] = [
  { label: 'Hecho', result: 'OK' },
  { label: 'No se pudo hacer', result: 'ISSUE' },
  { label: 'No aplica', result: 'NA' },
];

// Para cómo está una pieza.
export const STATE_OPTIONS: TemplateItemOption[] = [
  { label: 'Bien', result: 'OK' },
  { label: 'Mal estado', result: 'ISSUE' },
  { label: 'Requiere cambio', result: 'ISSUE' },
];

const DRAIN_OPTIONS: TemplateItemOption[] = [
  { label: 'Bien', result: 'OK' },
  { label: 'Obstruido', result: 'ISSUE' },
  { label: 'Con fuga', result: 'ISSUE' },
];

const REFRIGERANT_LINES_OPTIONS: TemplateItemOption[] = [
  { label: 'Bien', result: 'OK' },
  { label: 'Aislamiento dañado', result: 'ISSUE' },
  { label: 'Indicios de fuga', result: 'ISSUE' },
];

const LEAK_CHECK_OPTIONS: TemplateItemOption[] = [
  { label: 'Sin fugas', result: 'OK' },
  { label: 'Fuga detectada', result: 'ISSUE' },
  { label: 'No aplica', result: 'NA' },
];

const ELECTRICAL_OPTIONS: TemplateItemOption[] = [
  { label: 'Bien', result: 'OK' },
  { label: 'Requiere reapriete', result: 'ISSUE' },
  { label: 'Mal estado', result: 'ISSUE' },
];

const COMMUNICATION_OPTIONS: TemplateItemOption[] = [
  { label: 'Bien', result: 'OK' },
  { label: 'Fallo de comunicación', result: 'ISSUE' },
];

const SIGHT_GLASS_OPTIONS: TemplateItemOption[] = [
  { label: 'Bien', result: 'OK' },
  { label: 'Con burbujas', result: 'ISSUE' },
  { label: 'Indica humedad', result: 'ISSUE' },
];

const OIL_LEVEL_OPTIONS: TemplateItemOption[] = [
  { label: 'Correcto', result: 'OK' },
  { label: 'Bajo', result: 'ISSUE' },
  { label: 'Sin visor', result: 'NA' },
];

const HOT_SPOT_OPTIONS: TemplateItemOption[] = [
  { label: 'Sin indicios', result: 'OK' },
  { label: 'Con indicios', result: 'ISSUE' },
];

const LABELLING_OPTIONS: TemplateItemOption[] = [
  { label: 'Completa', result: 'OK' },
  { label: 'Incompleta', result: 'ISSUE' },
  { label: 'Falta', result: 'ISSUE' },
];

const task = (section: string, label: string, extra: Partial<LibraryItem> = {}): LibraryItem => ({
  section,
  label,
  type: 'CHOICE',
  options: TASK_OPTIONS,
  ...extra,
});

const state = (
  section: string,
  label: string,
  options: TemplateItemOption[] = STATE_OPTIONS,
  extra: Partial<LibraryItem> = {},
): LibraryItem => ({ section, label, type: 'CHOICE', options, ...extra });

const measure = (
  section: string,
  label: string,
  unit: string,
  extra: Partial<LibraryItem> = {},
): LibraryItem => ({ section, label, type: 'NUMBER', unit, ...extra });

const closing = (photoLabel: string): LibraryItem[] => [
  { section: 'Cierre', label: 'Incidencias observadas', type: 'TEXTAREA' },
  { section: 'Cierre', label: photoLabel, type: 'PHOTO', required: true },
];

const MAINS_VOLTAGE = {
  minValue: 207,
  maxValue: 253,
  helpText: 'Monofásica 230 V ±10 %.',
};

const THREE_PHASE_VOLTAGE = {
  minValue: 360,
  maxValue: 440,
  helpText: 'Trifásica 400 V ±10 %. Mide entre las tres fases y anota la más baja.',
};

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  {
    key: 'fancoil',
    name: 'Mantenimiento de fancoil',
    category: 'Fancoil',
    description: 'Limpieza, ventilación, temperaturas y control de un fancoil.',
    items: [
      task('Limpieza', 'Limpieza de filtros', { required: true }),
      task('Limpieza', 'Limpieza de batería'),
      task('Limpieza', 'Bandeja de condensados'),
      state('Limpieza', 'Desagüe de condensados', DRAIN_OPTIONS),
      state('Ventilación', 'Estado del ventilador'),
      state('Ventilación', 'Motor: ruidos y vibraciones'),
      task('Ventilación', 'Velocidades V1-V2-V3', {
        helpText: 'Comprueba que el ventilador funciona en las tres velocidades.',
      }),
      measure('Mediciones', 'Temperatura de impulsión', '°C', { required: true }),
      measure('Mediciones', 'Temperatura de retorno', '°C', { required: true }),
      state('Control', 'Termostato / mando'),
      state('Control', 'Válvula'),
      ...closing('Foto del equipo'),
    ],
  },
  {
    key: 'split',
    name: 'Mantenimiento de split',
    category: 'Split / Multisplit',
    description: 'Unidad interior, unidad exterior, mediciones y control de un split o multisplit.',
    items: [
      task('Unidad interior', 'Limpieza de filtros', { required: true }),
      task('Unidad interior', 'Limpieza de batería'),
      state('Unidad interior', 'Turbina / ventilador'),
      state('Unidad interior', 'Bandeja y desagüe de condensados', DRAIN_OPTIONS),
      state('Unidad interior', 'Carcasa y lamas'),
      task('Unidad exterior', 'Limpieza de batería del condensador'),
      state('Unidad exterior', 'Ventilador'),
      state('Unidad exterior', 'Soportes y antivibratorios'),
      state('Unidad exterior', 'Líneas frigoríficas y aislamiento', REFRIGERANT_LINES_OPTIONS),
      measure('Mediciones', 'Temperatura de impulsión', '°C', { required: true }),
      measure('Mediciones', 'Temperatura de retorno', '°C', { required: true }),
      measure('Mediciones', 'Consumo del compresor', 'A'),
      measure('Mediciones', 'Tensión de alimentación', 'V', MAINS_VOLTAGE),
      state('Control', 'Mando / termostato'),
      {
        section: 'Control',
        label: 'Códigos de error',
        type: 'TEXT',
        helpText: 'Déjalo vacío si el equipo no muestra ningún código.',
      },
      { section: 'Cierre', label: 'Incidencias observadas', type: 'TEXTAREA' },
      { section: 'Cierre', label: 'Foto de la unidad interior', type: 'PHOTO', required: true },
      { section: 'Cierre', label: 'Foto de la unidad exterior', type: 'PHOTO' },
    ],
  },
  {
    key: 'vrf',
    name: 'Mantenimiento de VRF (unidad exterior)',
    category: 'VRF / VRV',
    description:
      'Unidad exterior de un sistema VRF/VRV: limpieza, circuito frigorífico, gases fluorados y comunicación.',
    items: [
      task('Unidad exterior', 'Limpieza de baterías', { required: true }),
      state('Unidad exterior', 'Ventiladores'),
      state('Unidad exterior', 'Compresores: ruidos y vibraciones'),
      state('Unidad exterior', 'Soportes y antivibratorios'),
      state('Unidad exterior', 'Cuadro y conexiones eléctricas', ELECTRICAL_OPTIONS),
      measure('Mediciones', 'Presión de alta', 'bar'),
      measure('Mediciones', 'Presión de baja', 'bar'),
      measure('Mediciones', 'Temperatura exterior', '°C'),
      measure('Mediciones', 'Consumo total', 'A'),
      measure('Mediciones', 'Tensión entre fases', 'V', THREE_PHASE_VOLTAGE),
      state('Gases fluorados', 'Control de fugas', LEAK_CHECK_OPTIONS, {
        required: true,
        helpText: 'La periodicidad del control depende de la carga de gas en t CO₂ eq.',
      }),
      state('Gases fluorados', 'Líneas frigoríficas y aislamiento', REFRIGERANT_LINES_OPTIONS),
      measure('Gases fluorados', 'Refrigerante añadido', 'kg', {
        minValue: 0,
        helpText: 'Pon 0 si no se ha añadido refrigerante.',
      }),
      state(
        'Control y comunicación',
        'Comunicación con las unidades interiores',
        COMMUNICATION_OPTIONS,
      ),
      state('Control y comunicación', 'Control centralizado'),
      {
        section: 'Control y comunicación',
        label: 'Códigos de error',
        type: 'TEXT',
        helpText: 'Anota los códigos activos o del historial. Vacío si no hay ninguno.',
      },
      { section: 'Cierre', label: 'Incidencias observadas', type: 'TEXTAREA' },
      { section: 'Cierre', label: 'Foto de la unidad exterior', type: 'PHOTO', required: true },
      { section: 'Cierre', label: 'Foto de la placa de características', type: 'PHOTO' },
    ],
  },
  {
    key: 'vrf-interior',
    name: 'Mantenimiento de unidad interior VRF',
    category: 'Unidad interior VRF',
    description:
      'Unidad interior de un sistema VRF/VRV (cassette, conductos, mural): limpieza, ventilación, temperaturas y control.',
    items: [
      task('Limpieza', 'Limpieza de filtros', { required: true }),
      task('Limpieza', 'Limpieza de batería'),
      task('Limpieza', 'Bandeja de condensados'),
      state('Limpieza', 'Desagüe y bomba de condensados', DRAIN_OPTIONS),
      state('Ventilación', 'Turbina / ventilador'),
      state('Ventilación', 'Motor: ruidos y vibraciones'),
      measure('Mediciones', 'Temperatura de impulsión', '°C', { required: true }),
      measure('Mediciones', 'Temperatura de retorno', '°C', { required: true }),
      state('Control', 'Mando / termostato'),
      state('Control', 'Comunicación con la unidad exterior', COMMUNICATION_OPTIONS),
      {
        section: 'Control',
        label: 'Códigos de error',
        type: 'TEXT',
        helpText: 'Déjalo vacío si la unidad no muestra ningún código.',
      },
      ...closing('Foto de la unidad'),
    ],
  },
  {
    key: 'enfriadora',
    name: 'Mantenimiento de enfriadora',
    category: 'Enfriadora',
    description:
      'Circuito frigorífico, circuito hidráulico, compresores, seguridades y parte eléctrica de una enfriadora.',
    items: [
      measure('Circuito frigorífico', 'Presión de alta', 'bar', { required: true }),
      measure('Circuito frigorífico', 'Presión de baja', 'bar', { required: true }),
      measure('Circuito frigorífico', 'Recalentamiento', 'K'),
      measure('Circuito frigorífico', 'Subenfriamiento', 'K'),
      state('Circuito frigorífico', 'Visor de líquido', SIGHT_GLASS_OPTIONS),
      state('Circuito frigorífico', 'Control de fugas', LEAK_CHECK_OPTIONS, {
        required: true,
        helpText: 'La periodicidad del control depende de la carga de gas en t CO₂ eq.',
      }),
      measure('Circuito frigorífico', 'Refrigerante añadido', 'kg', {
        minValue: 0,
        helpText: 'Pon 0 si no se ha añadido refrigerante.',
      }),
      measure('Circuito hidráulico', 'Temperatura de entrada de agua', '°C', { required: true }),
      measure('Circuito hidráulico', 'Temperatura de salida de agua', '°C', { required: true }),
      measure('Circuito hidráulico', 'Presión del circuito', 'bar'),
      state('Circuito hidráulico', 'Bombas: ruidos y estanqueidad'),
      task('Circuito hidráulico', 'Limpieza del filtro de agua'),
      state('Compresores y ventilación', 'Compresores: ruidos y vibraciones'),
      measure('Compresores y ventilación', 'Consumo de compresores', 'A'),
      state('Compresores y ventilación', 'Nivel de aceite', OIL_LEVEL_OPTIONS),
      state('Compresores y ventilación', 'Ventiladores del condensador'),
      task('Compresores y ventilación', 'Limpieza de baterías'),
      task('Seguridades y control', 'Prueba de presostatos y flujostato', {
        helpText: 'Comprueba que las seguridades paran el equipo.',
      }),
      measure('Seguridades y control', 'Tensión entre fases', 'V', THREE_PHASE_VOLTAGE),
      state('Seguridades y control', 'Cuadro y conexiones eléctricas', ELECTRICAL_OPTIONS),
      {
        section: 'Seguridades y control',
        label: 'Alarmas registradas',
        type: 'TEXT',
        helpText: 'Anota las alarmas del historial. Vacío si no hay ninguna.',
      },
      ...closing('Foto del equipo'),
    ],
  },
  {
    key: 'cuadro-electrico',
    name: 'Revisión de cuadro eléctrico',
    category: 'Cuadro eléctrico',
    description: 'Inspección, conexiones, protecciones y mediciones de un cuadro eléctrico.',
    items: [
      state('Inspección', 'Estado general del cuadro'),
      task('Inspección', 'Limpieza interior'),
      state('Inspección', 'Puntos calientes o decoloraciones', HOT_SPOT_OPTIONS),
      state('Inspección', 'Rotulación y esquema', LABELLING_OPTIONS),
      task('Conexiones', 'Reapriete de bornes', { required: true }),
      state('Conexiones', 'Estado del cableado'),
      task('Protecciones', 'Prueba del botón de test de los diferenciales', { required: true }),
      state('Protecciones', 'Interruptores automáticos'),
      measure('Protecciones', 'Tiempo de disparo del diferencial', 'ms', {
        maxValue: 300,
        helpText:
          'Diferencial general a su sensibilidad nominal: máximo 300 ms. Los selectivos tienen otros tiempos.',
      }),
      measure('Mediciones', 'Tensión entre fases', 'V', THREE_PHASE_VOLTAGE),
      measure('Mediciones', 'Tensión fase-neutro', 'V', MAINS_VOLTAGE),
      measure('Mediciones', 'Intensidad en L1', 'A'),
      measure('Mediciones', 'Intensidad en L2', 'A'),
      measure('Mediciones', 'Intensidad en L3', 'A'),
      measure('Mediciones', 'Resistencia de aislamiento', 'MΩ', {
        minValue: 0.5,
        helpText: 'Medida a 500 V en circuitos de hasta 500 V: mínimo 0,5 MΩ.',
      }),
      measure('Mediciones', 'Resistencia de puesta a tierra', 'Ω', {
        helpText: 'Compárala con el valor del proyecto o de la última revisión.',
      }),
      ...closing('Foto del cuadro abierto'),
    ],
  },
];

export function findLibraryTemplate(key: string): LibraryTemplate | undefined {
  return TEMPLATE_LIBRARY.find((template) => template.key === key);
}