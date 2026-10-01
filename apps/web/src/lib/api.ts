import { supabase, API_URL } from './supabase';
import { leerOrgActual } from './org-actual';

/**
 * Ayudante para llamar a la API con el token de la sesion actual.
 *
 * Adjunta dos cabeceras:
 *  - Authorization: Bearer <token>  -> quién eres (lo verifica el backend).
 *  - X-Organizacion-Id: <uuid>      -> en qué organización estás trabajando.
 *
 * La segunda solo tiene efecto si el token dice rol=admin (suplantación de
 * tenant del Bloque 8.2). Para cualquier otro rol el backend la ignora, así
 * que mandarla siempre es inofensivo y nos evita condicionales por todas partes.
 */
export async function apiFetch<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const org = leerOrgActual();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(org ? { 'X-Organizacion-Id': org.id } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const msg = json?.message ?? `HTTP ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return json as T;
}
