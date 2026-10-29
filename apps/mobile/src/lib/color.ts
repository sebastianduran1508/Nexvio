/**
 * Utilidades de color (Bloque 8.5) — las mismas reglas que el panel
 * (apps/web/src/lib/color.ts). Contraste con la fórmula WCAG: de 1:1 a 21:1;
 * 4.5 es lo mínimo para leer texto normal sin esfuerzo.
 */

export const PRIMARIO_NEXVIO = '#5A46F0';
export const SECUNDARIO_NEXVIO = '#FF7A59';
const TEXTO_OSCURO = '#0E1525';

function aRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Blanco u oscuro: el texto que mejor se lee sobre ese fondo. */
export function textoSobre(fondo: string): string {
  return contraste(fondo, '#FFFFFF') >= contraste(fondo, TEXTO_OSCURO) ? '#FFFFFF' : TEXTO_OSCURO;
}

/** Mezcla con negro (cantidad 0..1). */
export function oscurecer(hex: string, cantidad: number): string {
  return '#' + aRgb(hex).map((v) => Math.round(v * (1 - cantidad)).toString(16).padStart(2, '0')).join('');
}

/** Mezcla con blanco (cantidad 0..1). */
export function aclarar(hex: string, cantidad: number): string {
  return '#' + aRgb(hex).map((v) => Math.round(v + (255 - v) * cantidad).toString(16).padStart(2, '0')).join('');
}

/** "#5A46F0" + 0.18 -> "rgba(90,70,240,0.18)" (para fondos suaves). */
export function conAlfa(hex: string, alfa: number): string {
  const [r, g, b] = aRgb(hex);
  return `rgba(${r},${g},${b},${alfa})`;
}

/**
 * Un color de TEXTO que se lea sobre el fondo dado, partiendo del color de
 * marca: lo va aclarando (fondo oscuro) u oscureciendo (fondo claro) de a 10 %
 * hasta llegar a 4.5:1. Así un azul muy oscuro elegido por el organizador
 * sigue leyéndose en el modo oscuro del teléfono.
 */
export function legibleSobre(color: string, fondo: string): string {
  const haciaClaro = luminancia(fondo) < 0.5;
  let c = color;
  for (let i = 1; i <= 9 && contraste(c, fondo) < 4.5; i++) {
    c = haciaClaro ? aclarar(color, i / 10) : oscurecer(color, i / 10);
  }
  return c;
}
