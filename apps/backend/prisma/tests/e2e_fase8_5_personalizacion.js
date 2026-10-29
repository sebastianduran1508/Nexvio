// ==========================================================================
// FASE 8 · Bloque 8.5 — Prueba END-TO-END de la personalización (8.5.c)
//
//   1. Un congreso sin personalización devuelve valores vacíos (no 404).
//   2. Colores: se guardan en mayúsculas; formato inválido -> 400; null vuelve
//      al color de Nexvio sin tocar el otro color.
//   3. Logo y portada en Storage: subir, reemplazar (borra el viejo), quitar
//      uno sin tocar el otro, e imagen desconocida en la ruta -> 400.
//   4. El detalle del congreso trae la personalización.
//   5. Borrar el congreso borra también sus imágenes de marca.
//
// Uso (desde apps/backend, con el backend corriendo y el bucket creado):
//   node prisma/tests/e2e_fase8_5_personalizacion.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_5_personalizacion.js <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${!ok && detalle ? '  -> ' + detalle : ''}`);
}

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await r.json()).access_token ?? null;
}

async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
async function subir(path, token) {
  const form = new FormData();
  form.append('archivo', new Blob([PNG_1X1], { type: 'image/png' }), 'imagen.png');
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}
const existe = async (url) => (await fetch(`${url}?v=${Date.now()}`)).ok;

(async () => {
  const token = await login(orgEmail, orgPass);
  if (!token) throw new Error('No se pudo iniciar sesión como organizador');
  let cid = null;

  try {
    const c = await api('POST', '/congresos', token, {
      nombre: `E2E Personalización ${Date.now()}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02',
    });
    cid = c.body.id;
    const base = `/congresos/${cid}/personalizacion`;

    // ---------- 1. Sin personalización ----------
    const v = await api('GET', base, token);
    check('Congreso sin personalización -> 200 con valores vacíos',
      v.status === 200 && v.body?.color_primario === null && v.body?.logo_url === null, JSON.stringify(v.body));

    // ---------- 2. Colores ----------
    const g1 = await api('PUT', base, token, { color_primario: '#0e7490', color_secundario: '#f59e0b' });
    check('Guardar colores -> 200 (se crea la fila)', g1.status === 200, JSON.stringify(g1.body));
    check('Los colores se guardan en mayúsculas', g1.body?.color_primario === '#0E7490' && g1.body?.color_secundario === '#F59E0B', JSON.stringify(g1.body));

    const mal1 = await api('PUT', base, token, { color_primario: 'azul' });
    check('Color "azul" -> 400', mal1.status === 400, JSON.stringify(mal1.body));
    const mal2 = await api('PUT', base, token, { color_primario: '#FFF' });
    check('Color corto "#FFF" -> 400 (se pide de 6 dígitos)', mal2.status === 400, JSON.stringify(mal2.body));

    const g2 = await api('PUT', base, token, { color_primario: null });
    check('color_primario null vuelve al de Nexvio y no toca el secundario',
      g2.body?.color_primario === null && g2.body?.color_secundario === '#F59E0B', JSON.stringify(g2.body));

    // ---------- 3. Imágenes ----------
    const l1 = await subir(`${base}/logo`, token);
    check('Subir logo -> 201 en la carpeta /marca/', l1.status === 201 && !!l1.body?.logo_url?.includes('/marca/logo-'), JSON.stringify(l1.body));
    const p1 = await subir(`${base}/portada`, token);
    check('Subir portada -> 201', p1.status === 201 && !!p1.body?.imagen_portada_url?.includes('/marca/portada-'), JSON.stringify(p1.body));
    check('Subir la portada no borró el logo', p1.body?.logo_url === l1.body?.logo_url, JSON.stringify(p1.body));

    const l2 = await subir(`${base}/logo`, token);
    check('Reemplazar el logo borra el viejo de Storage', !!l2.body?.logo_url && !(await existe(l1.body.logo_url)), l1.body?.logo_url);

    const q = await api('DELETE', `${base}/logo`, token);
    check('Quitar el logo -> null y se borra de Storage', q.body?.logo_url === null && !(await existe(l2.body.logo_url)), JSON.stringify(q.body));
    check('...y la portada sigue ahí', !!q.body?.imagen_portada_url && (await existe(q.body.imagen_portada_url)), q.body?.imagen_portada_url);

    const raro = await subir(`${base}/fondo`, token);
    check('Imagen desconocida en la ruta (/fondo) -> 400', raro.status === 400, JSON.stringify(raro.body));

    // ---------- 4. Detalle ----------
    const det = await api('GET', `/congresos/${cid}`, token);
    check('El detalle del congreso trae la personalización',
      det.body?.personalizacion?.color_secundario === '#F59E0B', JSON.stringify(det.body?.personalizacion));

    // ---------- 5. Borrar el congreso ----------
    const portada = q.body?.imagen_portada_url;
    const b = await api('DELETE', `/congresos/${cid}`, token);
    check('Borrar el congreso -> 200', b.status === 200, JSON.stringify(b.body));
    check('...y su portada se borra de Storage', !!portada && !(await existe(portada)), portada);
    if (b.status === 200) cid = null;
  } finally {
    if (cid) await api('DELETE', `/congresos/${cid}`, token);
  }

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones OK`);
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
