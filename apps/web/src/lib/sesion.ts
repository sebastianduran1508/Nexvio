import { supabase } from './supabase';

/** Los claims que nos interesan del JWT de Supabase. */
export type Claims = {
  sub: string;
  email?: string;
  rol?: string;
  organizacion_id?: string;
};

/**
 * Lee los claims del token SIN verificar la firma.
 *
 * ¿Es seguro? Sí, porque aquí solo decidimos qué PINTAR (si mostramos o no el
 * menú del superadmin). La seguridad de verdad la aplica el backend, que sí
 * verifica la firma del token en cada petición. Aunque alguien manipulara el
 * token en su navegador para "verse" como admin, la API le respondería 403.
 *
 * Regla general que vale la pena recordar: el frontend decide la EXPERIENCIA,
 * el backend decide los PERMISOS.
 */
export function leerClaims(token: string): Claims | null {
  try {
    const parte = token.split('.')[1];
    const json = atob(parte.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Claims;
  } catch {
    return null;
  }
}

/** Claims de la sesión actual (o null si no hay sesión). */
export async function claimsActuales(): Promise<Claims | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? leerClaims(token) : null;
}
