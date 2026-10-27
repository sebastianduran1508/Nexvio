/**
 * Zonas horarias para el congreso (Bloque 8.4).
 *
 * La zona dice en qué hora se ESCRIBE y se MUESTRA la agenda en el panel (la
 * hora del lugar del evento). Usamos los nombres oficiales IANA
 * ("America/Bogota"), que el backend valida con @IsTimeZone().
 *
 * ZONA_POR_PAIS predefine la zona al elegir el país del evento (idea de
 * Sebastián): casi siempre acierta, y para los países con varias zonas (México,
 * Estados Unidos, Brasil...) o los congresos virtuales se puede cambiar a mano.
 */
export const ZONAS: { valor: string; etiqueta: string }[] = [
  { valor: 'America/Bogota', etiqueta: 'Bogotá' },
  { valor: 'America/Mexico_City', etiqueta: 'Ciudad de México' },
  { valor: 'America/Cancun', etiqueta: 'Cancún' },
  { valor: 'America/Tijuana', etiqueta: 'Tijuana' },
  { valor: 'America/Lima', etiqueta: 'Lima' },
  { valor: 'America/Guayaquil', etiqueta: 'Guayaquil / Quito' },
  { valor: 'America/Panama', etiqueta: 'Panamá' },
  { valor: 'America/Costa_Rica', etiqueta: 'San José (Costa Rica)' },
  { valor: 'America/Guatemala', etiqueta: 'Guatemala' },
  { valor: 'America/El_Salvador', etiqueta: 'San Salvador' },
  { valor: 'America/Tegucigalpa', etiqueta: 'Tegucigalpa' },
  { valor: 'America/Managua', etiqueta: 'Managua' },
  { valor: 'America/Havana', etiqueta: 'La Habana' },
  { valor: 'America/Santo_Domingo', etiqueta: 'Santo Domingo' },
  { valor: 'America/Puerto_Rico', etiqueta: 'San Juan (Puerto Rico)' },
  { valor: 'America/Caracas', etiqueta: 'Caracas' },
  { valor: 'America/La_Paz', etiqueta: 'La Paz' },
  { valor: 'America/Santiago', etiqueta: 'Santiago de Chile' },
  { valor: 'America/Argentina/Buenos_Aires', etiqueta: 'Buenos Aires' },
  { valor: 'America/Montevideo', etiqueta: 'Montevideo' },
  { valor: 'America/Asuncion', etiqueta: 'Asunción' },
  { valor: 'America/Sao_Paulo', etiqueta: 'São Paulo' },
  { valor: 'America/New_York', etiqueta: 'Nueva York / Miami' },
  { valor: 'America/Chicago', etiqueta: 'Chicago' },
  { valor: 'America/Los_Angeles', etiqueta: 'Los Ángeles' },
  { valor: 'America/Toronto', etiqueta: 'Toronto' },
  { valor: 'Europe/Madrid', etiqueta: 'Madrid' },
  { valor: 'Europe/Lisbon', etiqueta: 'Lisboa' },
  { valor: 'Europe/London', etiqueta: 'Londres' },
  { valor: 'Europe/Paris', etiqueta: 'París' },
  { valor: 'Europe/Berlin', etiqueta: 'Berlín' },
  { valor: 'Europe/Rome', etiqueta: 'Roma' },
  { valor: 'UTC', etiqueta: 'UTC (hora universal)' },
];

export const ZONA_POR_PAIS: Record<string, string> = {
  CO: 'America/Bogota', MX: 'America/Mexico_City', PE: 'America/Lima',
  EC: 'America/Guayaquil', PA: 'America/Panama', CR: 'America/Costa_Rica',
  GT: 'America/Guatemala', SV: 'America/El_Salvador', HN: 'America/Tegucigalpa',
  NI: 'America/Managua', CU: 'America/Havana', DO: 'America/Santo_Domingo',
  PR: 'America/Puerto_Rico', VE: 'America/Caracas', BO: 'America/La_Paz',
  CL: 'America/Santiago', AR: 'America/Argentina/Buenos_Aires', UY: 'America/Montevideo',
  PY: 'America/Asuncion', BR: 'America/Sao_Paulo', US: 'America/New_York',
  CA: 'America/Toronto', ES: 'Europe/Madrid', PT: 'Europe/Lisbon',
  GB: 'Europe/London', IE: 'Europe/London', FR: 'Europe/Paris', DE: 'Europe/Berlin',
  IT: 'Europe/Rome', NL: 'Europe/Paris', BE: 'Europe/Paris', CH: 'Europe/Paris',
  AT: 'Europe/Berlin',
};
