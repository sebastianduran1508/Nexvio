import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { es } from './es';
import { en } from './en';
import { pt } from './pt';

/**
 * IDIOMAS DE LA APP (8.8, decisión 35): español, inglés y portugués (Brasil).
 *
 * i18next guarda los diccionarios y sabe cuál está activo; react-i18next le
 * da a las pantallas el hook useTranslation() → t('clave'). Cuando el idioma
 * cambia (i18n.changeLanguage), toda pantalla que use t() se vuelve a pintar.
 *
 * Qué idioma arranca: el del TELÉFONO si lo tenemos; si no, inglés (el más
 * entendido entre los visitantes). La elección de la persona en Perfil la
 * aplica IdiomaProvider encima de esto.
 */
export const IDIOMAS = ['es', 'en', 'pt'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Para fechas y horas (Intl): cada idioma con su región. */
const LOCALE: Record<Idioma, string> = { es: 'es-CO', en: 'en-US', pt: 'pt-BR' };

/** El idioma del teléfono, si es uno de los nuestros; si no, inglés. */
export function idiomaDelTelefono(): Idioma {
  const codigo = getLocales()[0]?.languageCode ?? 'en';
  return (IDIOMAS as readonly string[]).includes(codigo) ? (codigo as Idioma) : 'en';
}

/** El "locale" para formatear fechas y horas en el idioma activo ("en-US"…). */
export function locale(): string {
  return LOCALE[i18n.language as Idioma] ?? LOCALE.es;
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: idiomaDelTelefono(),
  // Si a un diccionario le faltara un texto, se muestra el de español (el original).
  fallbackLng: 'es',
  // React ya protege los textos: no hace falta que i18next los "escape".
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
