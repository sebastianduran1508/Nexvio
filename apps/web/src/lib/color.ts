/**
 * UTILIDADES DE COLOR (Bloque 8.5) — para la personalización de cada congreso.
 *
 * El problema que resuelven: el organizador elige el color de su evento, y la
 * app pone TEXTO encima de ese color (la cabecera, los botones). Si elige un
 * amarillo claro, el texto blanco no se lee. Así que medimos el CONTRASTE con
 * la misma fórmula que usan los navegadores y las pautas de accesibilidad
 * (WCAG 2.1): va de 1:1 (igual) a 21:1 (negro sobre blanco).
 *
 *   ≥ 4.5 -> se lee bien en cualquier tamaño (lo que pide WCAG nivel AA)
 *   ≥ 3   -> aceptable solo para textos grandes y en negrita
 *   < 3   -> no se lee
 */

/** Colores de marca de Nexvio: lo que se usa si el congreso no elige otros. */
export const PRIMARIO_NEXVIO = '#5A46F0';
export const SECUNDARIO_NEXVIO = '#FF7A59';
export const TEXTO_OSCURO = '#0E1525';

/** "#5A46F0" -> [90, 70, 240] */
function aRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * Luminancia relativa: cuánta luz "parece" tener un color para el ojo humano.
 * El verde pesa mucho más que el azul (0.7152 vs 0.0722) porque el ojo es más
 * sensible a él: por eso un verde y un azul con el mismo brillo técnico no se
 * ven igual de claros.
 */
function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre dos colores: de 1 a 21. */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Qué tan bien se lee el texto BLANCO sobre ese color. */
export function nivelContraste(hex: string): 'bueno' | 'justo' | 'malo' {
  const c = contraste(hex, '#FFFFFF');
  return c >= 4.5 ? 'bueno' : c >= 3 ? 'justo' : 'malo';
}

/**
 * El color de texto que mejor se lee sobre un fondo: blanco u oscuro.
 * Se usa para el color de ACENTO: así cualquier acento funciona, porque el
 * texto encima se elige solo.
 */
export function textoSobre(fondo: string): string {
  return contraste(fondo, '#FFFFFF') >= contraste(fondo, TEXTO_OSCURO) ? '#FFFFFF' : TEXTO_OSCURO;
}

/** Mezcla un color con negro (cantidad 0..1). Para el degradado de la cabecera. */
export function oscurecer(hex: string, cantidad: number): string {
  return (
    '#' +
    aRgb(hex)
      .map((v) => Math.round(v * (1 - cantidad)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** ¿Es un color "#RRGGBB" válido? */
export const esHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

/** Paleta sugerida para el color principal: las 8 superan 5:1 con texto blanco. */
export const PALETA_PRIMARIO = [
  { nombre: 'Violeta Nexvio', hex: '#5A46F0' },
  { nombre: 'Azul', hex: '#1D4ED8' },
  { nombre: 'Turquesa', hex: '#0F766E' },
  { nombre: 'Verde', hex: '#15803D' },
  { nombre: 'Rojo', hex: '#B91C1C' },
  { nombre: 'Fucsia', hex: '#BE185D' },
  { nombre: 'Naranja', hex: '#C2410C' },
  { nombre: 'Pizarra', hex: '#334155' },
];

/** Paleta sugerida para el acento (el texto encima se elige solo con textoSobre). */
export const PALETA_SECUNDARIO = [
  { nombre: 'Coral Nexvio', hex: '#FF7A59' },
  { nombre: 'Ámbar', hex: '#F59E0B' },
  { nombre: 'Turquesa claro', hex: '#14B8A6' },
  { nombre: 'Celeste', hex: '#38BDF8' },
  { nombre: 'Rosa', hex: '#F472B6' },
  { nombre: 'Lima', hex: '#84CC16' },
  { nombre: 'Lavanda', hex: '#A78BFA' },
  { nombre: 'Rojo vivo', hex: '#EF4444' },
];
