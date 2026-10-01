/**
 * La organización en la que el SUPERADMIN está trabajando ahora mismo.
 *
 * Se guarda en localStorage (no en memoria) por dos razones: sobrevive a
 * recargar la página, y `apiFetch` puede leerla sin que haya que pasarla a
 * mano por cada componente.
 *
 * Para un organizador normal esto NO se usa: su organización ya viene en el
 * token y el backend ignora la cabecera si el rol no es admin.
 */
const CLAVE = 'nexvio.org-actual';

export type OrgElegida = { id: string; nombre: string };

export function leerOrgActual(): OrgElegida | null {
  if (typeof window === 'undefined') return null; // en el servidor no hay localStorage
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as OrgElegida) : null;
  } catch {
    return null;
  }
}

export function guardarOrgActual(org: OrgElegida | null) {
  if (typeof window === 'undefined') return;
  try {
    if (org) window.localStorage.setItem(CLAVE, JSON.stringify(org));
    else window.localStorage.removeItem(CLAVE);
  } catch {
    /* modo incógnito o storage bloqueado: seguimos sin romper nada */
  }
}
