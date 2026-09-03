import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para el NAVEGADOR.
 *
 * Lo usa el panel web para dos cosas:
 *  - Iniciar sesión (supabase.auth.signInWithPassword).
 *  - Obtener el token de la sesión actual (supabase.auth.getSession) para
 *    mandárselo a nuestra API en la cabecera Authorization.
 *
 * Usa la clave "anon" (pública). El aislamiento de datos NO depende de que esta
 * clave sea secreta, sino del RLS del backend: aunque cualquiera tenga la anon
 * key, solo verá lo de su organización según su token.
 *
 * persistSession: guarda la sesión en el navegador para que no se pierda al
 * recargar. autoRefreshToken: renueva el token solo cuando está por expirar.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

// URL base de nuestra API (el backend NestJS).
export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
