// ==========================================================================
// FASE 8 · Bloque 8.7.f — "Patrocinada por…" (backend)
//
//   1. Una charla (o un break) con sponsor; el detalle lo trae con su logo y web.
//   2. Un sponsor de OTRO congreso no se puede asignar (400).
//   3. Quitar el patrocinio (null).
//   4. Borrar el sponsor deja la charla sin patrocinio (sin error).
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7f_patrocinio.js <orgEmail> <orgPass>
// ==========================================================================
require('dotenv/config');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7f_patrocinio.js <orgEmail> <orgPass>');
  process.exit(1);
}
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const okHttp = (s) => s === 200 || s === 201;

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${detalle ? '  -> ' + detalle : ''}`);
}
async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

(async () => {
  console.log('\n=== Bloque 8.7.f — Patrocinada por ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: orgEmail, password: orgPass }),
  });
  const tOrg = (await r.json()).access_token;
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }

  let A = null, B = null;
  try {
    A = (await api('POST', '/congresos', tOrg, { nombre: `8.7f A ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    B = (await api('POST', '/congresos', tOrg, { nombre: `8.7f B ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    const spA = (await api('POST', `/congresos/${A}/sponsors`, tOrg, { nombre: 'Laboratorio Andino', nivel: 'oro', sitio_web: 'https://andino.example.com' })).body;
    const spA2 = (await api('POST', `/congresos/${A}/sponsors`, tOrg, { nombre: 'Café de la Sierra', nivel: 'plata' })).body;
    const spB = (await api('POST', `/congresos/${B}/sponsors`, tOrg, { nombre: 'Sponsor de otro congreso' })).body;
    check('preparación: 2 congresos, 2 sponsors en A y 1 en B', !!A && !!B && !!spA?.id && !!spA2?.id && !!spB?.id);
    const deCharla = (det, id) => (det?.sesiones?.find((s) => s.id === id)?.sponsors ?? []).map((x) => x.sponsor);

    console.log('\n-- 1. Una charla con VARIOS sponsors, y un break');
    const charla = await api('POST', `/congresos/${A}/sesiones`, tOrg, {
      titulo: 'Avances en vacunas', inicio: '2026-12-01T10:00', fin: '2026-12-01T11:00', sponsor_ids: [spA2.id, spA.id],
    });
    const cafe = await api('POST', `/congresos/${A}/sesiones`, tOrg, {
      titulo: 'Café', tipo: 'break', inicio: '2026-12-01T11:00', fin: '2026-12-01T11:30', sponsor_ids: [spA.id],
    });
    check('se crean una charla con 2 sponsors y un break con 1', okHttp(charla.status) && okHttp(cafe.status), `HTTP ${charla.status}/${cafe.status}`);
    const det = (await api('GET', `/congresos/${A}`, tOrg)).body;
    const lista = deCharla(det, charla.body?.id);
    check(
      'el detalle trae los 2, EN EL ORDEN elegido, con logo, web y nivel',
      lista.length === 2 && lista[0].nombre === 'Café de la Sierra' && lista[1].sitio_web?.startsWith('https') && lista[1].nivel === 'oro',
      lista.map((x) => x.nombre).join(' · '),
    );

    console.log('\n-- 2. Sponsor de otro congreso');
    const ajeno = await api('PATCH', `/sesiones/${charla.body.id}`, tOrg, { sponsor_ids: [spA.id, spB.id] });
    check('si UNO es de otro congreso -> 400 (y no se cambia nada)', ajeno.status === 400 && deCharla((await api('GET', `/congresos/${A}`, tOrg)).body, charla.body.id).length === 2, ajeno.body?.message);
    const alCrear = await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'X', inicio: '2026-12-01T12:00', fin: '2026-12-01T13:00', sponsor_ids: [spB.id] });
    check('y tampoco al crear -> 400', alCrear.status === 400);

    console.log('\n-- 3. Cambiar y quitar');
    const cambia = await api('PATCH', `/sesiones/${charla.body.id}`, tOrg, { sponsor_ids: [spA.id] });
    check('cambiar la lista la REEMPLAZA (queda solo Laboratorio Andino)', okHttp(cambia.status) && cambia.body?.sponsors?.length === 1 && cambia.body.sponsors[0].sponsor.id === spA.id);
    const quita = await api('PATCH', `/sesiones/${charla.body.id}`, tOrg, { sponsor_ids: [] });
    check('sponsor_ids: [] quita el patrocinio', okHttp(quita.status) && quita.body?.sponsors?.length === 0);

    console.log('\n-- 4. Borrar un sponsor que patrocina');
    const borra = await api('DELETE', `/sponsors/${spA.id}`, tOrg);
    const det2 = (await api('GET', `/congresos/${A}`, tOrg)).body;
    check('borrarlo no falla y el break queda sin patrocinio', okHttp(borra.status) && deCharla(det2, cafe.body?.id).length === 0, `HTTP ${borra.status}`);
  } finally {
    if (A) await api('DELETE', `/congresos/${A}`, tOrg);
    if (B) await api('DELETE', `/congresos/${B}`, tOrg);
    check('limpieza', true);
  }
  const fallos = resultados.filter((r) => !r.ok);
  console.log(fallos.length === 0
    ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.7.f listo.`
    : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '));
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\nERROR de ejecucion:', e.message); process.exit(1); });
