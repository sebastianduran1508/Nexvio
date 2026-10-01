/**
 * Catálogo de países (ISO-3166-1 alpha-2) en español.
 *
 * Existe para NORMALIZAR: si cada quien escribe el país a mano, acabamos con
 * "Colombia", "colombia", "COL" y "Colombía" en la misma columna, y luego no se
 * puede agrupar ni filtrar. Guardamos el nombre visible y el código de dos
 * letras por separado: el nombre es lo que se lee, el código es lo que el front
 * usa para pintar la bandera (y así dibujarla no depende de la ortografía).
 *
 * Se reutilizará en el Bloque 8.4 para la ficha de los speakers.
 *
 * Formato compacto "CODIGO:Nombre" para que el archivo sea legible de un vistazo.
 */
const CRUDO = [
  'AR:Argentina', 'BO:Bolivia', 'BR:Brasil', 'CL:Chile', 'CO:Colombia',
  'CR:Costa Rica', 'CU:Cuba', 'DO:República Dominicana', 'EC:Ecuador',
  'SV:El Salvador', 'GT:Guatemala', 'HN:Honduras', 'MX:México',
  'NI:Nicaragua', 'PA:Panamá', 'PY:Paraguay', 'PE:Perú', 'PR:Puerto Rico',
  'UY:Uruguay', 'VE:Venezuela',
  'US:Estados Unidos', 'CA:Canadá',
  'ES:España', 'PT:Portugal', 'FR:Francia', 'IT:Italia', 'DE:Alemania',
  'GB:Reino Unido', 'IE:Irlanda', 'NL:Países Bajos', 'BE:Bélgica',
  'CH:Suiza', 'AT:Austria', 'SE:Suecia', 'NO:Noruega', 'DK:Dinamarca',
  'FI:Finlandia', 'PL:Polonia', 'CZ:Chequia', 'GR:Grecia', 'RO:Rumania',
  'HU:Hungría', 'RU:Rusia', 'UA:Ucrania', 'TR:Turquía',
  'MA:Marruecos', 'EG:Egipto', 'ZA:Sudáfrica', 'NG:Nigeria', 'KE:Kenia',
  'IL:Israel', 'AE:Emiratos Árabes Unidos', 'SA:Arabia Saudita',
  'IN:India', 'CN:China', 'JP:Japón', 'KR:Corea del Sur',
  'SG:Singapur', 'TH:Tailandia', 'ID:Indonesia', 'PH:Filipinas',
  'AU:Australia', 'NZ:Nueva Zelanda',
];

export type Pais = { codigo: string; nombre: string };

export const PAISES: Pais[] = CRUDO.map((s) => {
  const [codigo, nombre] = s.split(':');
  return { codigo, nombre };
}).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/** Busca un país por su nombre exacto (lo que devuelve el selector). */
export function paisPorNombre(nombre: string): Pais | undefined {
  return PAISES.find((p) => p.nombre === nombre);
}
