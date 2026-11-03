import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { olvidarTelefono } from '../lib/push';
import { api } from '../lib/api';
import type { Yo } from '../lib/tipos';

/**
 * "Contexto de sesion": una memoria compartida por TODA la app que sabe si hay
 * un usuario logueado. Cualquier pantalla puede leerlo con useAuth().
 *
 * Asi evitamos pasar la sesion a mano de pantalla en pantalla, y la navegacion
 * puede decidir sola que mostrar (login vs app) segun haya sesion o no.
 */
type AuthContextType = {
  session: Session | null;
  loading: boolean;
  /**
   * 8.7.a: QUIÉN es la persona (GET /auth/yo). Con esto la navegación decide si
   * mostrar el "primer ingreso" (cambiar clave / aceptar datos) o la app.
   *  - undefined -> todavía no se sabe (cargando)
   *  - null      -> no se pudo traer (sin internet): se ofrece reintentar
   */
  yo: Yo | null | undefined;
  recargarYo: () => Promise<void>;
  /** Acepta usuario (JPGarcia) o correo. */
  signIn: (usuarioOCorreo: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [yo, setYo] = useState<Yo | null | undefined>(undefined);

  useEffect(() => {
    // 1) Al arrancar, recuperamos la sesion guardada (si el usuario ya se habia
    //    logueado, sigue logueado gracias a AsyncStorage).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // 2) Nos suscribimos a los cambios de sesion (login, logout, refresh de token)
    //    para mantener el estado siempre al dia.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // 8.7.a: cada vez que cambia QUIÉN está logueado, pedimos sus datos.
  // (Dependemos del id y no de la sesión entera: el token se renueva solo cada
  // hora y no queremos volver a pedir /auth/yo por eso.)
  const usuarioId = session?.user.id;
  const recargarYo = useCallback(async () => {
    if (!usuarioId) {
      setYo(undefined);
      return;
    }
    try {
      setYo(await api<Yo>('GET', '/auth/yo'));
    } catch {
      setYo(null);
    }
  }, [usuarioId]);

  useEffect(() => {
    setYo(undefined);
    void recargarYo();
  }, [recargarYo]);

  /**
   * 8.7.a: el asistente entra con su USUARIO (JPGarcia, el que le llegó con la
   * contraseña temporal); el staff, con su correo. Si lo escrito no tiene "@",
   * primero le pedimos al backend el correo de ese usuario (Supabase solo sabe
   * de correos) y luego entramos normal.
   */
  async function signIn(usuarioOCorreo: string, password: string) {
    const texto = usuarioOCorreo.trim();
    if (!texto || !password) throw new Error('Escribe tu usuario y tu contraseña');

    let email = texto;
    if (!texto.includes('@')) {
      try {
        const r = await api<{ email: string }>('POST', '/auth/resolver-usuario', {
          username: texto,
        });
        email = r.email;
      } catch {
        // Mismo mensaje que una clave mala: no revelamos si el usuario existe.
        throw new Error('Usuario o contraseña incorrectos');
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Usuario o contraseña incorrectos');
    // No hace falta setSession aqui: onAuthStateChange lo actualiza solo.
  }

  async function signOut() {
    // 8.6: ANTES de cerrar (todavía hay token para hablar con la API), este
    // teléfono deja de recibir avisos de esta persona.
    await olvidarTelefono();
    await supabase.auth.signOut();
  }

  const value = useMemo(
    () => ({ session, loading, yo, recargarYo, signIn, signOut }),
    [session, loading, yo, recargarYo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para leer la sesion desde cualquier pantalla. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
