// ==========================================================================
// FASE 8 · Bloque 8.10 — Preguntas PRIVADAS y sin "aprobar" (decisión 39)
//
// Con Ana y Beto en la misma charla:
//   1. Ana pregunta -> la ve de inmediato, "pendiente". Beto NO la ve.
//   2. Beto pregunta -> ve solo la suya; Ana sigue viendo solo la de ella.
//   3. El staff ve las dos (con nombre completo).
//   4. "Aprobar" ya no existe (400). El staff marca respondida la de Ana:
//      Ana la ve respondida; Beto sigue sin verla (el caso de la reunión).
//   5. Descartar y volver a pendiente; un asistente no puede moderar (403).
//   6. Una pregunta vieja en 'aprobada' se muestra como 'pendiente'.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_10_preguntas.js <orgEmail> <orgPass>
// ==========================================================================
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_10_preguntas.js <orgEmail> <orgPass>');
  process.exit(1);
}
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const okHttp = (s) => s === 200 || s === 201;

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${detalle ? '  -> ' + detalle : ''}`);
}
async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  return (await r.json()).access_token ?? null;
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
  console.log('\n=== Bloque 8.10 — Preguntas privadas ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  let congresoId = null;
  const creados = [];
  try {
    // ---------- Preparación ----------
    congresoId = (await api('POST', '/congresos', tOrg, { nombre: `8.10 ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    const sesionId = (await api('POST', `/congresos/${congresoId}/sesiones`, tOrg, {
      titulo: 'Charla de prueba', inicio: '2026-12-01T14:00:00Z', fin: '2026-12-01T15:00:00Z',
    })).body?.id;
    const p = {};
    for (const [k, nombre] of [['ana', 'Ana'], ['beto', 'Beto']]) {
      const r = await api('POST', `/congresos/${congresoId}/asistentes`, tOrg, {
        nombres: nombre, apellidos: `Preguntas ${sufijo}`, tipo_documento: 'CC', numero_documento: `T810${k}${sufijo}`,
      });
      creados.push(r.body?.id);
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: r.body?.username })).body?.email;
      p[k] = { id: r.body?.id, token: await login(email, r.body?.password_temporal) };
    }
    const { ana, beto } = p;
    const pol = await api('GET', '/auth/politica-datos', ana.token);
    for (const x of [ana, beto]) await api('POST', '/auth/aceptar-datos', x.token, { version: pol.body?.version });
    check('preparación: congreso, charla, Ana y Beto', !!congresoId && !!sesionId && !!ana.token && !!beto.token);

    const ver = async (quien) => (await api('GET', `/sesiones/${sesionId}/preguntas`, quien.token ?? quien)).body ?? [];
    const ids = (lista) => lista.map((q) => q.id);

    // ---------- 1. Ana pregunta ----------
    console.log('\n-- 1. Ana pregunta');
    const pAna = (await api('POST', `/sesiones/${sesionId}/preguntas`, ana.token, { texto: '¿Compartirán las diapositivas?' })).body;
    check('Ana envía su pregunta (queda pendiente)', pAna?.estado === 'pendiente');
    const vAna1 = await ver(ana);
    check('Ana la ve de inmediato, como pendiente', vAna1.length === 1 && vAna1[0].id === pAna.id && vAna1[0].estado === 'pendiente');
    check('Beto NO la ve', (await ver(beto)).length === 0);

    // ---------- 2. Beto pregunta ----------
    console.log('\n-- 2. Beto pregunta');
    const pBeto = (await api('POST', `/sesiones/${sesionId}/preguntas`, beto.token, { texto: '¿Hay certificado?' })).body;
    const vBeto = await ver(beto);
    check('Beto ve SOLO la suya', JSON.stringify(ids(vBeto)) === JSON.stringify([pBeto?.id]));
    check('Ana sigue viendo SOLO la suya', JSON.stringify(ids(await ver(ana))) === JSON.stringify([pAna.id]));

    // ---------- 3. El staff ----------
    console.log('\n-- 3. El staff');
    const vStaff = await ver(tOrg);
    check('el staff ve las dos', [pAna.id, pBeto.id].every((id) => ids(vStaff).includes(id)));
    check('el staff ve nombre y apellidos', vStaff.find((q) => q.id === pAna.id)?.usuario?.apellidos === `Preguntas ${sufijo}`);

    // ---------- 4. Responder (el caso de la reunión) ----------
    console.log('\n-- 4. Responder');
    const aprobar = await api('PATCH', `/preguntas/${pAna.id}`, tOrg, { estado: 'aprobada' });
    check('"Aprobar" ya no existe -> 400', aprobar.status === 400, `HTTP ${aprobar.status}`);
    const resp = await api('PATCH', `/preguntas/${pAna.id}`, tOrg, { estado: 'respondida' });
    check('el staff marca respondida la de Ana (directo, sin aprobar)', okHttp(resp.status) && resp.body?.estado === 'respondida');
    check('Ana la ve RESPONDIDA', (await ver(ana))[0]?.estado === 'respondida');
    const vBeto2 = await ver(beto);
    check('Beto sigue SIN ver la de Ana (el caso de la reunión)', !ids(vBeto2).includes(pAna.id) && vBeto2.length === 1);

    // ---------- 5. Descartar, deshacer, permisos ----------
    console.log('\n-- 5. Descartar y deshacer');
    const desc = await api('PATCH', `/preguntas/${pBeto.id}`, tOrg, { estado: 'rechazada' });
    check('el staff descarta la de Beto', okHttp(desc.status));
    check('Beto la ve descartada (no desaparece sin explicación)', (await ver(beto))[0]?.estado === 'rechazada');
    const desh = await api('PATCH', `/preguntas/${pBeto.id}`, tOrg, { estado: 'pendiente' });
    check('el staff la devuelve a pendiente (deshacer)', okHttp(desh.status) && desh.body?.estado === 'pendiente');
    const intruso = await api('PATCH', `/preguntas/${pBeto.id}`, ana.token, { estado: 'respondida' });
    check('un asistente NO puede marcar respondida -> 403', intruso.status === 403, `HTTP ${intruso.status}`);

    // ---------- 6. Legado: 'aprobada' ----------
    console.log('\n-- 6. Preguntas viejas en "aprobada"');
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      await tx.pregunta.update({ where: { id: pBeto.id }, data: { estado: 'aprobada' } });
    }, { maxWait: 15000, timeout: 20000 });
    check('una "aprobada" vieja se muestra como pendiente (a su autor)', (await ver(beto))[0]?.estado === 'pendiente');
    check('...y al staff', (await ver(tOrg)).find((q) => q.id === pBeto.id)?.estado === 'pendiente');
  } finally {
    console.log('\n-- Limpieza');
    if (congresoId) await api('DELETE', `/congresos/${congresoId}`, tOrg);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      for (const id of creados.filter(Boolean)) {
        await tx.consentimientoDatos.deleteMany({ where: { usuario_id: id } });
        await tx.usuario.delete({ where: { id } }).catch(() => undefined);
      }
    }, { maxWait: 15000, timeout: 20000 });
    for (const id of creados.filter(Boolean)) {
      await fetch(`${SUPA}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } }).catch(() => undefined);
    }
    await prisma.$disconnect();
    check('datos de prueba borrados', true);
  }

  const fallos = resultados.filter((r) => !r.ok);
  console.log(fallos.length === 0
    ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Preguntas privadas listas.`
    : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '));
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\nERROR de ejecucion:', e.message); process.exit(1); });
