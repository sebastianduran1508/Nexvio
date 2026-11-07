import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { idiomaDelTelefono, type Idioma } from './index';

/**
 * LA ELECCIÓN DE IDIOMA DE LA PERSONA (8.8) — el gemelo de TemaProvider.
 *
 *   preferencia "telefono"     -> el del teléfono (o inglés si no lo tenemos)
 *   preferencia "es"|"en"|"pt" -> ese, siempre
 *
 * Se guarda en el teléfono (AsyncStorage), como el tema. No hay idioma
 * elegido por el organizador (decisión 35). No pinta nada hasta leer la
 * preferencia guardada, para que la app no "salte" de un idioma a otro al
 * abrir (son milisegundos y el splash los tapa).
 */
export type PreferenciaIdioma = 'telefono' | Idioma;
const CLAVE = 'nexvio.idioma';

type Estado = {
  preferencia: PreferenciaIdioma;
  cambiarPreferencia: (p: PreferenciaIdioma) => void;
  /** El que se está viendo ahora. */
  idioma: Idioma;
};
const Ctx = createContext<Estado | undefined>(undefined);

export function IdiomaProvider({ children }: { children: React.ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaIdioma>('telefono');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((p) => {
        if (p === 'es' || p === 'en' || p === 'pt') setPreferencia(p);
      })
      .catch(() => undefined)
      .finally(() => setListo(true));
  }, []);

  const idioma: Idioma = preferencia === 'telefono' ? idiomaDelTelefono() : preferencia;

  // Cada vez que cambia, se lo decimos a i18next: las pantallas se repintan solas.
  useEffect(() => {
    if (i18n.language !== idioma) void i18n.changeLanguage(idioma);
  }, [idioma]);

  const value = useMemo<Estado>(
    () => ({
      preferencia,
      cambiarPreferencia: (p) => {
        setPreferencia(p);
        AsyncStorage.setItem(CLAVE, p).catch(() => undefined);
      },
      idioma,
    }),
    [preferencia, idioma],
  );

  if (!listo) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIdioma(): Estado {
  const c = useContext(Ctx);
  if (!c) throw new Error('useIdioma debe usarse dentro de <IdiomaProvider>');
  return c;
}
