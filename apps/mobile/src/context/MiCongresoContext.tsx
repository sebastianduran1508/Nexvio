import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import type { Congreso } from '../lib/tipos';
import { useAuth } from './AuthContext';

/**
 * "MI CONGRESO" (Bloque 8.7.b) — en qué congreso(s) está la persona y cuál ve.
 *
 * El backend ya solo le devuelve los congresos en los que está inscrita
 * (GET /congresos filtrado + AccesoCongresoGuard). Aquí se decide qué mostrar:
 *  - 0 congresos  -> "aún no tienes un congreso asignado";
 *  - 1 congreso   -> ese, directo (sin lista);
 *  - 2 o más      -> el que eligió la última vez (se recuerda en el teléfono);
 *                    si no hay ninguno elegido, el selector.
 *
 * Ejemplo: Laura está en "Medicina 2026" y "Simposio de Cardiología". Elige
 * Medicina; mañana abre la app y entra directo a Medicina. Desde Perfil puede
 * "Cambiar de congreso".
 */
type Estado = {
  cargando: boolean;
  error: string | null;
  congresos: Congreso[];
  /** El congreso que se está viendo (null = hay que elegir o no hay ninguno). */
  actual: Congreso | null;
  elegir: (id: string) => void;
  /** Vuelve al selector (solo tiene sentido con 2 o más). */
  cambiar: () => void;
  recargar: () => Promise<void>;
};

const Ctx = createContext<Estado | undefined>(undefined);

const clave = (usuarioId: string) => `nexvio.congresoActual.${usuarioId}`;

export function MiCongresoProvider({ children }: { children: React.ReactNode }) {
  const { yo } = useAuth();
  const usuarioId = yo?.id ?? '';
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [actualId, setActualId] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!usuarioId) return;
    setError(null);
    try {
      const [lista, guardado] = await Promise.all([
        api<Congreso[]>('GET', '/congresos'),
        AsyncStorage.getItem(clave(usuarioId)).catch(() => null),
      ]);
      setCongresos(lista);
      if (lista.length === 1) setActualId(lista[0].id);
      else if (guardado && lista.some((c) => c.id === guardado)) setActualId(guardado);
      else setActualId(null); // 0, o varios sin elegir (o el guardado ya no está)
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar tus congresos');
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const elegir = useCallback(
    (id: string) => {
      setActualId(id);
      AsyncStorage.setItem(clave(usuarioId), id).catch(() => undefined);
    },
    [usuarioId],
  );

  const cambiar = useCallback(() => {
    setActualId(null);
    AsyncStorage.removeItem(clave(usuarioId)).catch(() => undefined);
  }, [usuarioId]);

  const value = useMemo<Estado>(
    () => ({
      cargando,
      error,
      congresos,
      actual: congresos.find((c) => c.id === actualId) ?? null,
      elegir,
      cambiar,
      recargar,
    }),
    [cargando, error, congresos, actualId, elegir, cambiar, recargar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMiCongreso() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMiCongreso debe usarse dentro de <MiCongresoProvider>');
  return ctx;
}
