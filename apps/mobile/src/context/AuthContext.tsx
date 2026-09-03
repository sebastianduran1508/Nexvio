import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // No hace falta setSession aqui: onAuthStateChange lo actualiza solo.
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para leer la sesion desde cualquier pantalla. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
