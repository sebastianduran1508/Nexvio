import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TemaCtx } from './tema';
import { useTemaCongreso } from '../context/MarcaContext';

/**
 * EL TEMA DE LA APP (Bloque 8.7.g).
 *
 * Dos decisiones se combinan:
 *  1. La PREFERENCIA de la persona (Perfil → Apariencia), guardada en el
 *     teléfono:  congreso (la de siempre) · sistema · claro · oscuro.
 *  2. El TEMA POR DEFECTO del congreso, que eligió el organizador en el panel.
 *
 *   preferencia "claro" / "oscuro" -> esa, siempre (manda la persona).
 *   preferencia "sistema"          -> la del teléfono.
 *   preferencia "congreso"         -> la del organizador; si él dejó
 *                                     "según el teléfono", la del teléfono.
 *
 * El tema del congreso también se recuerda en el teléfono: así, al abrir la
 * app, ya arranca con él (sin "parpadear" del claro al oscuro mientras carga).
 */
export type PreferenciaTema = 'congreso' | 'sistema' | 'claro' | 'oscuro';

type Estado = {
  preferencia: PreferenciaTema;
  cambiarPreferencia: (p: PreferenciaTema) => void;
  /** El que eligió el organizador (para mostrarlo en Apariencia). */
  temaCongreso: 'sistema' | 'claro' | 'oscuro' | null;
  /** El que se está viendo ahora. */
  modo: 'claro' | 'oscuro';
};

const Ctx = createContext<Estado | undefined>(undefined);
const CLAVE_PREF = 'nexvio.temaPreferencia';
const CLAVE_CONGRESO = 'nexvio.temaCongreso';

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const sistema = useColorScheme() === 'dark' ? 'oscuro' : 'claro';
  const delCongresoAhora = useTemaCongreso();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('congreso');
  const [recordado, setRecordado] = useState<'sistema' | 'claro' | 'oscuro' | null>(null);

  // Al arrancar: lo que la persona eligió y el último tema de congreso visto.
  useEffect(() => {
    AsyncStorage.multiGet([CLAVE_PREF, CLAVE_CONGRESO])
      .then(([[, p], [, c]]) => {
        // (La opción "Según mi teléfono" se quitó: quien la tenía pasa a "Por defecto".)
        if (p === 'claro' || p === 'oscuro') setPreferencia(p);
        else if (p === 'congreso' || p === 'sistema') setPreferencia('congreso');
        if (c === 'sistema' || c === 'claro' || c === 'oscuro') setRecordado(c);
      })
      .catch(() => undefined);
  }, []);

  // Cuando se abre un congreso, recordamos su tema para la próxima vez.
  useEffect(() => {
    if (!delCongresoAhora) return;
    setRecordado(delCongresoAhora);
    AsyncStorage.setItem(CLAVE_CONGRESO, delCongresoAhora).catch(() => undefined);
  }, [delCongresoAhora]);

  const temaCongreso = delCongresoAhora ?? recordado;

  const modo: 'claro' | 'oscuro' =
    preferencia === 'claro' || preferencia === 'oscuro'
      ? preferencia
      : preferencia === 'congreso' && (temaCongreso === 'claro' || temaCongreso === 'oscuro')
        ? temaCongreso
        : sistema;

  const value = useMemo<Estado>(
    () => ({
      preferencia,
      cambiarPreferencia: (p) => {
        setPreferencia(p);
        AsyncStorage.setItem(CLAVE_PREF, p).catch(() => undefined);
      },
      temaCongreso,
      modo,
    }),
    [preferencia, temaCongreso, modo],
  );

  return (
    <Ctx.Provider value={value}>
      <TemaCtx.Provider value={modo}>{children}</TemaCtx.Provider>
    </Ctx.Provider>
  );
}

/** Para la pantalla Apariencia. */
export function useApariencia() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApariencia debe usarse dentro de <TemaProvider>');
  return ctx;
}
