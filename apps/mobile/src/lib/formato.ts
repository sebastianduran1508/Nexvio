/**
 * Formatos de fecha y hora en español (es-CO).
 *
 * OJO con las fechas de los congresos: el backend las guarda como fecha "pura"
 * (sin hora) y llegan como "2026-10-24T00:00:00.000Z" (medianoche en UTC).
 * Si la formateamos con la hora de Colombia (UTC-5), ¡sale el día ANTERIOR!
 * (23 oct a las 7 p. m.). Por eso las fechas de congreso se leen en UTC.
 * Las horas de las SESIONES sí son instantes reales y se muestran en hora local.
 */

/** Fecha de congreso: "24 oct 2026". */
export function fecha(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d
    .toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .replace(/\./g, '');
}

/** Rango de fechas de un congreso: "24 – 25 oct 2026" o "28 feb – 2 mar 2026". */
export function rangoFechas(ini?: string, fin?: string): string {
  if (!ini) return '';
  if (!fin || ini.slice(0, 10) === fin.slice(0, 10)) return fecha(ini);
  const a = new Date(ini);
  const b = new Date(fin);
  const mismoMes =
    a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const opt = (o: Intl.DateTimeFormatOptions) =>
    ({ ...o, timeZone: 'UTC' }) as Intl.DateTimeFormatOptions;
  const izq = mismoMes
    ? a.toLocaleDateString('es-CO', opt({ day: 'numeric' }))
    : a.toLocaleDateString('es-CO', opt({ day: 'numeric', month: 'short' }));
  const der = b.toLocaleDateString('es-CO', opt({ day: 'numeric', month: 'short', year: 'numeric' }));
  return `${izq} – ${der}`.replace(/\./g, '');
}

/** Mes corto y día de una fecha de congreso, para el "cuadrito" de calendario. */
export function mesDia(iso: string): { mes: string; dia: string } {
  const d = new Date(iso);
  return {
    mes: d
      .toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' })
      .replace(/\./g, '')
      .toUpperCase(),
    dia: String(d.getUTCDate()),
  };
}

/** Hoy en formato "YYYY-MM-DD" (hora local del teléfono). */
export function hoyISO(): string {
  return claveDia(new Date().toISOString());
}

/** ¿El congreso está ocurriendo hoy? Compara solo fechas, sin horas. */
export function enCurso(ini: string, fin: string): boolean {
  const hoy = hoyISO();
  return ini.slice(0, 10) <= hoy && hoy <= fin.slice(0, 10);
}

/** Formatea solo la hora (para las sesiones), en hora local: "09:00". */
export function hora(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/** Clave del día LOCAL de un instante: "2026-10-24". Sirve para agrupar la agenda. */
export function claveDia(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

/** Etiqueta de pestaña de día a partir de su clave: { semana: "Sáb", dia: "24 oct" }. */
export function etiquetaDia(clave: string): { semana: string; dia: string } {
  const [y, m, d] = clave.split('-').map(Number);
  const f = new Date(y, m - 1, d, 12); // mediodía local: sin sustos de zona horaria
  const semana = f.toLocaleDateString('es-CO', { weekday: 'short' }).replace(/\./g, '');
  const dia = f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace(/\./g, '');
  return { semana: semana.charAt(0).toUpperCase() + semana.slice(1), dia };
}

/** ¿Esta sesión está ocurriendo AHORA? */
export function enVivo(ini: string, fin: string): boolean {
  const ahora = Date.now();
  return new Date(ini).getTime() <= ahora && ahora < new Date(fin).getTime();
}
