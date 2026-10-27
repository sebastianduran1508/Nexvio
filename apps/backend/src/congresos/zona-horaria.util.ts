import { BadRequestException } from '@nestjs/common';

/**
 * ZONA HORARIA DE LA AGENDA (Bloque 8.4).
 *
 * El acuerdo: cuando el admin escribe "09:00" en el panel, es la hora DEL LUGAR
 * DEL EVENTO (congreso.zona_horaria), esté donde esté el admin. El backend
 * convierte esa hora a un instante UTC y lo guarda. Después, cada teléfono lo
 * muestra en su propia zona (un asistente virtual en Madrid ve su hora).
 *
 * Ejemplo: congreso en "America/Mexico_City" (UTC-6), el admin escribe
 * "2026-11-12T09:00"  ->  se guarda 2026-11-12T15:00:00Z.
 */

/**
 * Formato aceptado para inicio/fin de una sesión:
 *   "2026-11-12T09:00"            -> SIN zona: hora del evento (la convierte el backend)
 *   "2026-11-12T09:00:00-05:00"   -> CON zona: se respeta tal cual (seed, scripts)
 *   "2026-11-12T14:00:00Z"        -> CON zona (UTC): se respeta tal cual
 */
export const FORMATO_FECHA_HORA =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/;

/** ¿El texto ya trae zona ("Z" o "+hh:mm" / "-hh:mm" al final)? */
function traeZona(valor: string): boolean {
  return /(Z|[+-]\d{2}:?\d{2})$/.test(valor);
}

/**
 * Cuántos milisegundos está adelantada la zona respecto de UTC en ese instante.
 * Bogotá -> -5 h. Madrid en verano -> +2 h.
 *
 * Truco: Intl nos dice qué hora "marca el reloj" en esa zona para un instante
 * dado. Si leemos esa hora como si fuera UTC y le restamos el instante real,
 * la diferencia es justamente el desfase.
 */
function desfaseMs(zona: string, instante: number): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instante));
  const v = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  const relojComoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'));
  return relojComoUtc - Math.floor(instante / 1000) * 1000;
}

/**
 * Convierte el inicio/fin que llega en el cuerpo a un instante (Date) real.
 *  - Si trae zona, se respeta.
 *  - Si no, se interpreta como hora del reloj en `zona` (la del congreso).
 */
export function aInstante(valor: string, zona: string): Date {
  if (!FORMATO_FECHA_HORA.test(valor)) {
    throw new BadRequestException(`Fecha y hora inválida: "${valor}"`);
  }
  if (traeZona(valor)) {
    const d = new Date(valor);
    if (isNaN(d.getTime())) throw new BadRequestException(`Fecha y hora inválida: "${valor}"`);
    return d;
  }

  // "2026-11-12T09:00" -> números sueltos.
  const [fecha, horaTxt] = valor.split('T');
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm, ss = 0] = horaTxt.split(':').map((x) => Math.floor(Number(x)));
  const comoUtc = Date.UTC(y, m - 1, d, hh, mm, ss);

  // Primera aproximación: restar el desfase de la zona. Se recalcula una vez
  // con el resultado por si en medio hay un cambio de horario de verano.
  let instante = comoUtc - desfaseMs(zona, comoUtc);
  instante = comoUtc - desfaseMs(zona, instante);

  const resultado = new Date(instante);
  // Defensa contra fechas imposibles ("2026-02-31"): Date.UTC las "corre" de mes.
  if (isNaN(resultado.getTime()) || new Date(comoUtc).getUTCDate() !== d) {
    throw new BadRequestException(`Fecha y hora inválida: "${valor}"`);
  }
  return resultado;
}

/** El día "YYYY-MM-DD" que marca el calendario en `zona` para ese instante. */
export function diaEnZona(instante: Date, zona: string): string {
  // 'en-CA' formatea como "2026-11-12", justo el formato que necesitamos.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}
