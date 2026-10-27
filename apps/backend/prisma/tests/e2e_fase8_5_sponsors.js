// ==========================================================================
// FASE 8 · Bloque 8.5 — Prueba END-TO-END de sponsors (8.5.a)
//
//   1. Crear sponsors en los 4 niveles; el sitio web se normaliza
//      ("www.x.com" -> "https://www.x.com"); dirección o nivel inválidos -> 400.
//   2. Orden: Oro primero, luego Plata, Bronce y General (en la lista y en el
//      detalle del congreso, que ahora trae los sponsors).
//   3. Reordenar con /orden (y rechazar ids de otro congreso).
//   4. Cambiar de nivel lo manda de último en el nivel nuevo.
//   5. Logo en Storage: subir, reemplazar (borra el viejo), quitar, y borrar el
//      sponsor borra su logo.
//   6. BORRAR UN CONGRESO CON SPONSORS funciona y limpia sus imágenes
//      (antes del 8.5 habría fallado por la clave foránea).
//
// Uso (desde apps/backend, con el backend corriendo y el bucket creado):
//   node prisma/tests/e2e_fase8_5_sponsors.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_5_sponsors.js <orgEmail> <orgPass>');
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
async function subirLogo(id, token) {
  const form = new FormData();
  form.append('archivo', new Blob([PNG_1X1], { type: 'image/png' }), 'logo.png');
  const r = await fetch(`${API}/sponsors/${id}/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}
const existe = async (url) => (await fetch(`${url}?v=${Date.now()}`)).ok;

(async () => {
  const token = await login(orgEmail, orgPass);
  if (!token) throw new Error('No se pudo iniciar sesión como organizador');
  const creados = [];

  try {
    const c = await api('POST', '/congresos', token, {
      nombre: `E2E Sponsors ${Date.now()}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02',
    });
    const cid = c.body.id;
    creados.push(cid);
    const otro = await api('POST', '/congresos', token, {
      nombre: `E2E Sponsors otro ${Date.now()}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02',
    });
    creados.push(otro.body.id);

    // ---------- 1. Crear ----------
    const gen = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'General SA' });
    check('Crear sponsor sin nivel -> 201 y nivel "general"', gen.status === 201 && gen.body?.nivel === 'general', JSON.stringify(gen.body));
    const bronce = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'Bronce Ltda', nivel: 'bronce' });
    const oroB = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'Oro Beta', nivel: 'oro', sitio_web: 'www.orobeta.com' });
    check('El sitio "www.orobeta.com" se guarda con https://', oroB.body?.sitio_web === 'https://www.orobeta.com/', oroB.body?.sitio_web);
    const oroA = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'Oro Alfa', nivel: 'oro' });
    const plata = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'Plata Corp', nivel: 'plata' });

    const malUrl = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'X', sitio_web: 'esto no es web' });
    check('Sitio web inválido -> 400', malUrl.status === 400, JSON.stringify(malUrl.body));
    const malNivel = await api('POST', `/congresos/${cid}/sponsors`, token, { nombre: 'X', nivel: 'diamante' });
    check('Nivel desconocido -> 400', malNivel.status === 400, JSON.stringify(malNivel.body));

    // ---------- 2. Orden ----------
    const l1 = await api('GET', `/congresos/${cid}/sponsors`, token);
    const nombres = (l) => l.body.map((s) => s.nombre).join(' > ');
    check('Orden: Oro (en orden de creación) > Plata > Bronce > General',
      nombres(l1) === 'Oro Beta > Oro Alfa > Plata Corp > Bronce Ltda > General SA', nombres(l1));
    const det = await api('GET', `/congresos/${cid}`, token);
    check('El detalle del congreso trae los sponsors ya ordenados',
      det.body?.sponsors?.map((s) => s.nombre).join(' > ') === nombres(l1), JSON.stringify(det.body?.sponsors?.map((s) => s.nombre)));

    // ---------- 3. Reordenar ----------
    const ord = await api('POST', `/congresos/${cid}/sponsors/orden`, token, { ids: [oroA.body.id, oroB.body.id] });
    check('Reordenar el nivel Oro -> Alfa antes que Beta', ord.status === 201 && nombres(ord).startsWith('Oro Alfa > Oro Beta'), nombres(ord));
    const ajeno = await api('POST', `/congresos/${otro.body.id}/sponsors`, token, { nombre: 'Ajeno' });
    const ordMal = await api('POST', `/congresos/${cid}/sponsors/orden`, token, { ids: [oroA.body.id, ajeno.body.id] });
    check('Reordenar con un sponsor de OTRO congreso -> 400', ordMal.status === 400, JSON.stringify(ordMal.body));

    // ---------- 4. Cambiar de nivel ----------
    const sube = await api('PATCH', `/sponsors/${plata.body.id}`, token, { nivel: 'oro' });
    check('Plata sube a Oro -> queda de último en Oro', sube.status === 200 && sube.body?.orden === 2, JSON.stringify(sube.body));
    const quitaWeb = await api('PATCH', `/sponsors/${oroB.body.id}`, token, { sitio_web: '' });
    check('Mandar sitio vacío lo quita (null)', quitaWeb.body?.sitio_web === null, JSON.stringify(quitaWeb.body));

    // ---------- 5. Logo ----------
    const lg1 = await subirLogo(oroA.body.id, token);
    check('Subir logo -> 201 con URL del bucket', lg1.status === 201 && !!lg1.body?.logo_url?.includes('/nexvio-publico/'), JSON.stringify(lg1.body));
    const lg2 = await subirLogo(oroA.body.id, token);
    check('Reemplazar el logo borra el viejo', !!lg2.body?.logo_url && !(await existe(lg1.body.logo_url)), lg1.body?.logo_url);
    const q = await api('DELETE', `/sponsors/${oroA.body.id}/logo`, token);
    check('Quitar el logo -> null y se borra de Storage', q.body?.logo_url === null && !(await existe(lg2.body.logo_url)), JSON.stringify(q.body));
    const lg3 = await subirLogo(bronce.body.id, token);
    await api('DELETE', `/sponsors/${bronce.body.id}`, token);
    check('Borrar un sponsor borra su logo', !!lg3.body?.logo_url && !(await existe(lg3.body.logo_url)), lg3.body?.logo_url);

    // ---------- 6. Borrar el congreso CON sponsors ----------
    const lg4 = await subirLogo(gen.body.id, token);
    const borra = await api('DELETE', `/congresos/${cid}`, token);
    check('Borrar un congreso que tiene sponsors -> 200', borra.status === 200, JSON.stringify(borra.body));
    check('...y sus logos se borran de Storage', !!lg4.body?.logo_url && !(await existe(lg4.body.logo_url)), lg4.body?.logo_url);
    if (borra.status === 200) creados.splice(creados.indexOf(cid), 1);
  } finally {
    for (const id of creados) if (id) await api('DELETE', `/congresos/${id}`, token);
  }

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones OK`);
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
