'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { claimsActuales, type Claims } from '@/lib/sesion';
import {
  leerOrgActual,
  guardarOrgActual,
  type OrgElegida,
} from '@/lib/org-actual';

export type OrganizacionResumen = {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  total_congresos: number;
};

type Panel = {
  claims: Claims | null;
  esSuperadmin: boolean;
  /** La organización en la que se está trabajando (solo aplica al superadmin). */
  orgActual: OrgElegida | null;
  cambiarOrg: (org: OrgElegida | null, destino?: string) => void;
  /** Las organizaciones del sistema (solo se cargan si eres superadmin). */
  organizaciones: OrganizacionResumen[];
  recargarOrganizaciones: () => Promise<void>;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
};

const Ctx = createContext<Panel | null>(null);

/**
 * A dónde ir después de cambiar de organización.
 *
 * Una ruta con un id dentro (/congresos/<id>, /congresos/<id>/asistentes,
 * /sesiones/<id>) pertenece a UNA organización concreta: si recargamos esa
 * misma ruta ya trabajando en otra organización, el RLS hace invisible ese id
 * y la pantalla muestra "No se pudo cargar el congreso". Es el aislamiento
 * funcionando bien; lo que estaba mal era quedarse en esa ruta.
 *
 * Por eso volvemos a la raíz de la sección, que sí existe en cualquier
 * organización. Las rutas del superadmin no dependen del tenant y se respetan.
 */
function destinoSeguro(ruta: string): string {
  if (ruta.startsWith('/superadmin')) return ruta;
  if (ruta.startsWith('/usuarios')) return '/usuarios';
  return '/congresos';
}

/**
 * El "estado compartido" de todo el panel: quién eres y, si eres superadmin,
 * en qué organización estás trabajando.
 *
 * Vive una sola vez en el layout, y cualquier pantalla lo lee con usePanel().
 * Así el selector de organización y las páginas no tienen que pasarse datos
 * entre ellas.
 */
export function PanelProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [claims, setClaims] = useState<Claims | null>(null);
  const [orgActual, setOrgActual] = useState<OrgElegida | null>(null);
  const [organizaciones, setOrganizaciones] = useState<OrganizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  const esSuperadmin = claims?.rol === 'admin';

  const recargarOrganizaciones = useCallback(async () => {
    const lista = await apiFetch<OrganizacionResumen[]>(
      'GET',
      '/superadmin/organizaciones',
    );
    setOrganizaciones(lista);
    return lista;
  }, []);

  useEffect(() => {
    (async () => {
      const c = await claimsActuales();
      if (!c) {
        router.replace('/login');
        return;
      }
      setClaims(c);

      if (c.rol === 'admin') {
        try {
          const lista = await apiFetch<OrganizacionResumen[]>(
            'GET',
            '/superadmin/organizaciones',
          );
          setOrganizaciones(lista);

          // Recuperamos la que estaba elegida; si ya no existe (o nunca hubo),
          // entramos a la primera para que el panel nunca quede "en el aire".
          const guardada = leerOrgActual();
          const valida =
            guardada && lista.some((o) => o.id === guardada.id)
              ? guardada
              : lista[0]
                ? { id: lista[0].id, nombre: lista[0].nombre }
                : null;
          guardarOrgActual(valida);
          setOrgActual(valida);
        } catch {
          /* si falla, el panel sigue y la pantalla mostrará el error */
        }
      } else {
        // Un organizador no suplanta a nadie: limpiamos cualquier resto.
        guardarOrgActual(null);
        setOrgActual(null);
      }
      setCargando(false);
    })();
  }, [router]);

  const cambiarOrg = useCallback((org: OrgElegida | null, destino?: string) => {
    guardarOrgActual(org);
    setOrgActual(org);
    // Recarga COMPLETA (no router.push) a propósito: así no queda ni un dato
    // de la organización anterior flotando en pantalla. Cambiar de tenant es
    // un cambio de contexto grande; vale la pena empezar de cero.
    window.location.href = destino ?? destinoSeguro(window.location.pathname);
  }, []);

  const cerrarSesion = useCallback(async () => {
    guardarOrgActual(null);
    await supabase.auth.signOut();
    router.replace('/login');
  }, [router]);

  return (
    <Ctx.Provider
      value={{
        claims,
        esSuperadmin,
        orgActual,
        cambiarOrg,
        organizaciones,
        recargarOrganizaciones: async () => {
          await recargarOrganizaciones();
        },
        cargando,
        cerrarSesion,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Hook para leer el estado del panel desde cualquier pantalla. */
export function usePanel() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePanel() debe usarse dentro de <PanelProvider>');
  return ctx;
}
