import { supabase } from './supabase';
import { API_URL } from './config';
import i18n from '../i18n';

/**
 * 8.8: la app le dice al backend en qué idioma va, para que los mensajes de
 * error y la política de datos lleguen traducidos. Es una cabecera PROPIA
 * (no Accept-Language) para que el panel web, que no la manda, siga en español.
 */
function cabeceraIdioma() {
  return { 'X-Idioma': i18n.language || 'es' };
}

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
      ...cabeceraIdioma(),
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

/**
 * Sube una imagen del teléfono como multipart/form-data (8.7.c: la foto de
 * perfil). En React Native el archivo se describe con { uri, name, type } y
 * NO se pone Content-Type a mano: fetch lo arma con su "boundary".
 */
export async function apiSubirImagen<T = any>(path: string, uri: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const form = new FormData();
  form.append('archivo', { uri, name: 'foto.jpg', type: 'image/jpeg' } as any);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...cabeceraIdioma(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const msg = json?.message || `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return json as T;
}
