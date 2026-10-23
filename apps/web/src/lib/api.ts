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

/** Las mismas cabeceras de apiFetch, para los casos que no mandan JSON. */
async function cabeceras(conJson = false) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const org = leerOrgActual();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(org ? { 'X-Organizacion-Id': org.id } : {}),
    ...(conJson ? { 'Content-Type': 'application/json' } : {}),
  } as Record<string, string>;
}

/**
 * Sube un archivo (multipart/form-data) y devuelve la respuesta JSON.
 *
 * Ojo con algo que despista: NO se pone Content-Type a mano. El navegador lo
 * genera solo, y tiene que incluir el "boundary" que separa las partes del
 * formulario. Si lo escribimos nosotros, ese boundary falta y el servidor no
 * puede leer el archivo.
 */
export async function apiSubirArchivo<T = any>(
  path: string,
  archivo: File,
  campo = 'archivo',
): Promise<T> {
  const form = new FormData();
  form.append(campo, archivo);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: await cabeceras(),
    body: form,
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

/**
 * Pide un archivo a la API y dispara la descarga en el navegador.
 *
 * El truco: la respuesta llega como "blob" (bytes), creamos una URL temporal
 * en memoria, simulamos un clic en un enlace invisible y la liberamos. Es la
 * forma estándar de descargar algo que requiere mandar un token, porque un
 * <a href> normal no puede llevar cabeceras.
 */
export async function apiDescargar(
  method: 'GET' | 'POST',
  path: string,
  nombreArchivo: string,
  body?: unknown,
): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: await cabeceras(!!body),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message ?? msg;
    } catch {
      /* el error no era JSON */
    }
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
