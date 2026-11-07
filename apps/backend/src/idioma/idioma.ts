/**
 * IDIOMA DE LA RESPUESTA (8.8, decisión 35).
 *
 * La app del asistente manda en cada petición la cabecera `X-Idioma`
 * ("es" | "en" | "pt"). Es propia a propósito y NO la estándar
 * `Accept-Language`: los NAVEGADORES mandan esa solos, y entonces el panel
 * de un organizador con Chrome en inglés empezaría a recibir errores en
 * inglés. El panel no manda X-Idioma -> sigue en español.
 * Si no llega o no es uno de los nuestros -> español (el original).
 */
export const CABECERA_IDIOMA = 'x-idioma';
export type Idioma = 'es' | 'en' | 'pt';

export function idiomaDe(cabecera?: string | string[] | null): Idioma {
  const valor = (Array.isArray(cabecera) ? cabecera[0] : cabecera ?? '').toLowerCase().trim();
  const codigo = valor.slice(0, 2);
  return codigo === 'en' || codigo === 'pt' ? codigo : 'es';
}
