import { supabase } from './supabase';
import { API_URL } from './config';

/**
 * Ayudante para llamar al backend con el token de la sesion actual.
 * Adjunta Authorization: Bearer <token> automaticamente (igual que el panel web).
 * Si el backend responde con error, lanza una excepcion con su mensaje.
 */
export async function api<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* respuestas sin cuerpo (ej. 204) */
  }

  if (!res.ok) {
    const msg = json?.message || `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return json as T;
}
