import 'i18next';
import type { es } from './es';

/**
 * Le dice a TypeScript qué claves EXISTEN (las de es.ts). Así, un error como
 * t('tabs.miAgnda') no llega al teléfono: `npx tsc --noEmit` lo marca. Y el
 * editor autocompleta las claves al escribir t('…').
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof es };
  }
}
