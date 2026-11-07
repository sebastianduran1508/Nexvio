import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import i18n from '../i18n';

import { avisoError } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
/**
 * MI AGENDA (8.7.e) — qué charlas tiene marcadas la persona con ⭐.
 *
 * Una sola memoria para toda la app: la estrella se ve en la agenda del
 * congreso, dentro de la charla y en la pestaña "Mi agenda", y las tres
 * cambian juntas.
 *
 * Al tocar la estrella el cambio se ve AL INSTANTE (actualización
 * "optimista"); si el servidor falla, se devuelve a como estaba y se avisa.
 */
type Estado = {
  ids: Set<string>;
  cargando: boolean;
  esFavorita: (sesionId: string) => boolean;
  alternar: (sesionId: string) => Promise<void>;
  recargar: () => Promise<void>;
};

const Ctx = createContext<Estado | undefined>(undefined);

export function MiAgendaProvider({ congresoId, children }: { congresoId?: string; children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  // Lo marcado "ahora mismo", para decidir al tocar (ver alternar).
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const recargar = useCallback(async () => {
    if (!congresoId) {
      setIds(new Set());
      setCargando(false);
      return;
    }
    try {
      const r = await api<{ sesion_ids: string[] }>('GET', `/congresos/${congresoId}/mi-agenda`);
      setIds(new Set(r.sesion_ids));
    } catch {
      /* sin internet: se queda como estaba */
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useEffect(() => {
    setCargando(true);
    void recargar();
  }, [recargar]);

  const alternar = useCallback(async (sesionId: string) => {
    // Se decide ANTES de setIds: React puede ejecutar la función de setIds más
    // tarde, y la llamada al servidor necesita saber ya si es marcar o quitar.
    const marcar = !idsRef.current.has(sesionId);
    setIds((actual) => {
      const nuevo = new Set(actual);
      if (marcar) nuevo.add(sesionId);
      else nuevo.delete(sesionId);
      return nuevo;
    });
    try {
      await api(marcar ? 'POST' : 'DELETE', `/sesiones/${sesionId}/favorita`);
    } catch (e: any) {
      // Deshacemos el cambio optimista.
      setIds((actual) => {
        const nuevo = new Set(actual);
        if (marcar) nuevo.delete(sesionId);
        else nuevo.add(sesionId);
        return nuevo;
      });
      avisoError(i18n.t('dialogo.noGuardarFavorito'), e?.message ?? i18n.t('dialogo.revisaConexion'));
    }
  }, []);

  const value = useMemo<Estado>(
    () => ({ ids, cargando, esFavorita: (id) => ids.has(id), alternar, recargar }),
    [ids, cargando, alternar, recargar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMiAgenda() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMiAgenda debe usarse dentro de <MiAgendaProvider>');
  return ctx;
}
