/**
 * HORAS DEL PANEL EN LA ZONA DEL EVENTO (Bloque 8.4).
 *
 * El acuerdo: en el panel, "09:00" es la hora del LUGAR DEL EVENTO
 * (congreso.zona_horaria), esté donde esté el admin. Así que todo lo que el
 * panel MUESTRA de la agenda también se pinta en esa zona; si no, el formulario
 * diría 09:00 y la lista 08:00 cuando el admin está en otro país.
 *
 * (La app móvil es distinta a propósito: cada asistente ve su propia zona.)
 */

/** "09:00" del instante, en la zona dada. */
export function horaEnZona(iso: string, zona: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** "2026-11-12": el día que marca el calendario en la zona dada. */
export function diaEnZona(iso: string, zona: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** "Bogotá · GMT-5": ciudad legible + desfase actual de la zona. */
export function etiquetaZona(zona: string): string {
  const ciudad = (zona.split('/').pop() ?? zona).replace(/_/g, ' ');
  let desfase = '';
  try {
    desfase =
      new Intl.DateTimeFormat('es-CO', { timeZone: zona, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    /* navegador sin 'shortOffset': mostramos solo la ciudad */
  }
  return desfase ? `${ciudad} · ${desfase}` : ciudad;
}

/**
 * Todos los días del congreso, aunque no tengan sesiones todavía (hacen falta
 * para poder crear en ellos). Las fechas del congreso son fechas "puras" y
 * llegan a medianoche UTC: se leen en UTC.
 */
export function diasDelCongreso(fechaInicio: string, fechaFin: string): string[] {
  const dias: string[] = [];
  const d = new Date(fechaInicio.slice(0, 10) + 'T00:00:00Z');
  const fin = fechaFin.slice(0, 10);
  // Tope de seguridad: ningún congreso real dura más de 60 días.
  for (let i = 0; i < 60; i++) {
    const clave = d.toISOString().slice(0, 10);
    if (clave > fin) break;
    dias.push(clave);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dias;
}

/** { semana: "Jueves", dia: "12 nov" } para una clave "2026-11-12". */
export function etiquetaDia(clave: string): { semana: string; dia: string } {
  const f = new Date(clave + 'T12:00:00Z');
  const semana = f.toLocaleDateString('es-CO', { weekday: 'long', timeZone: 'UTC' });
  const dia = f
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace(/\./g, '');
  return { semana: semana.charAt(0).toUpperCase() + semana.slice(1), dia };
}

/** ¿Está ocurriendo ahora? (no depende de zonas: compara instantes). */
export function enVivo(ini: string, fin: string): boolean {
  const ahora = Date.now();
  return new Date(ini).getTime() <= ahora && ahora < new Date(fin).getTime();
}
