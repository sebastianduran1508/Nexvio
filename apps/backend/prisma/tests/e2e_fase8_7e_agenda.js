// ==========================================================================
// FASE 8 · Bloque 8.7.e — Mi agenda (backend)
//
// Con Ana y Beto en un congreso con 2 charlas y 1 break:
//   1. Marcar y desmarcar charlas con ⭐ (idempotente; los breaks no).
//   2. El conteo por charla para el panel (solo el número, nunca quiénes).
//   3. Aviso "solo a quienes marcaron la charla": le llega a Ana y no a Beto.
//   4. No se puede marcar una charla de otro congreso (portero 8.7.b).
//   5. Borrar una charla con ⭐ no falla (la lección del 8.5).
//   6. Limpieza.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7e_agenda.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7e_agenda.js <orgEmail> <orgPass>');
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
  console.log('\n=== Bloque 8.7.e — Mi agenda ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  let A = null, B = null;
  const creados = [];
  try {
    // ---------- Preparación ----------
    A = (await api('POST', '/congresos', tOrg, { nombre: `8.7e A ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    B = (await api('POST', '/congresos', tOrg, { nombre: `8.7e B ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    const c1 = (await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'IA en cardiología', inicio: '2026-12-01T10:00', fin: '2026-12-01T11:00' })).body;
    const c2 = (await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'Taller de ecografía', inicio: '2026-12-01T11:30', fin: '2026-12-01T12:30' })).body;
    const cafe = (await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'Café', tipo: 'break', inicio: '2026-12-01T11:00', fin: '2026-12-01T11:30' })).body;
    const ajena = (await api('POST', `/congresos/${B}/sesiones`, tOrg, { titulo: 'Charla de otro congreso', inicio: '2026-12-01T10:00', fin: '2026-12-01T11:00' })).body;
    const p = {};
    for (const [k, nombre] of [['ana', 'Ana'], ['beto', 'Beto']]) {
      const r = await api('POST', `/congresos/${A}/asistentes`, tOrg, { nombres: nombre, apellidos: `Agenda ${sufijo}`, tipo_documento: 'CC', numero_documento: `T7E${k}${sufijo}` });
      creados.push(r.body?.id);
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: r.body?.username })).body?.email;
      p[k] = { id: r.body?.id, token: await login(email, r.body?.password_temporal) };
    }
    const { ana, beto } = p;
    check('preparación: 2 congresos, 2 charlas + 1 break, Ana y Beto', !!A && !!B && !!c1?.id && !!c2?.id && !!cafe?.id && !!ajena?.id && !!ana.token && !!beto.token);

    console.log('\n-- 1. Marcar y desmarcar');
    const m1 = await api('POST', `/sesiones/${c1.id}/favorita`, ana.token);
    const m1b = await api('POST', `/sesiones/${c1.id}/favorita`, ana.token);
    check('Ana marca "IA en cardiología" (dos veces no la duplica)', okHttp(m1.status) && okHttp(m1b.status) && m1b.body?.marcada === true);
    await api('POST', `/sesiones/${c2.id}/favorita`, ana.token);
    const des = await api('DELETE', `/sesiones/${c2.id}/favorita`, ana.token);
    check('marca y desmarca "Taller de ecografía"', okHttp(des.status) && des.body?.marcada === false);
    const agendaAna = await api('GET', `/congresos/${A}/mi-agenda`, ana.token);
    check('la agenda de Ana tiene SOLO la de IA', JSON.stringify(agendaAna.body?.sesion_ids) === JSON.stringify([c1.id]));
    const agendaBeto = await api('GET', `/congresos/${A}/mi-agenda`, beto.token);
    check('la de Beto está vacía (cada quien ve lo suyo)', (agendaBeto.body?.sesion_ids ?? ['x']).length === 0);
    const brk = await api('POST', `/sesiones/${cafe.id}/favorita`, ana.token);
    check('un break no se puede marcar (400)', brk.status === 400);

    console.log('\n-- 2. El conteo para el panel');
    const sesiones = (await api('GET', `/congresos/${A}/sesiones`, tOrg)).body ?? [];
    const s1 = sesiones.find((s) => s.id === c1.id);
    check('la charla de IA muestra "⭐ 1" (solo el número)', s1?._count?.favoritas === 1 && !JSON.stringify(s1).includes(ana.id));

    console.log('\n-- 3. Aviso solo a quienes la marcaron');
    const sinSesion = await api('POST', `/congresos/${A}/notificaciones`, tOrg, { titulo: 'Cambio', cuerpo: 'x', destino: 'favoritos' });
    check('"favoritos" sin elegir la charla -> 400', sinSesion.status === 400);
    const aviso = await api('POST', `/congresos/${A}/notificaciones`, tOrg, {
      titulo: 'Cambio de salón', cuerpo: 'La charla de IA pasa al salón 3', destino: 'favoritos', sesion_id: c1.id,
    });
    check('el organizador envía el aviso "solo a quienes la marcaron"', okHttp(aviso.status) && aviso.body?.destino === 'favoritos', `HTTP ${aviso.status}`);
    const avisosAna = (await api('GET', `/congresos/${A}/avisos`, ana.token)).body ?? [];
    const avisosBeto = (await api('GET', `/congresos/${A}/avisos`, beto.token)).body ?? [];
    check('Ana (la marcó) lo ve en sus Avisos', avisosAna.some((a) => a.titulo === 'Cambio de salón'));
    check('Beto (no la marcó) NO lo ve', !avisosBeto.some((a) => a.titulo === 'Cambio de salón'));
    const general = await api('POST', `/congresos/${A}/notificaciones`, tOrg, { titulo: 'Bienvenidos', cuerpo: 'Hola a todos' });
    const avisosBeto2 = (await api('GET', `/congresos/${A}/avisos`, beto.token)).body ?? [];
    check('un aviso general sí le llega a Beto', okHttp(general.status) && avisosBeto2.some((a) => a.titulo === 'Bienvenidos'));

    console.log('\n-- 4. El portero');
    const deOtro = await api('POST', `/sesiones/${ajena.id}/favorita`, ana.token);
    check('marcar una charla de OTRO congreso -> 404', deOtro.status === 404);

    console.log('\n-- 5. Borrar una charla con ⭐');
    const borra = await api('DELETE', `/sesiones/${c1.id}`, tOrg);
    const agendaFin = await api('GET', `/congresos/${A}/mi-agenda`, ana.token);
    check('se borra sin error y sale de la agenda de Ana', okHttp(borra.status) && (agendaFin.body?.sesion_ids ?? ['x']).length === 0, `HTTP ${borra.status}`);
  } finally {
    console.log('\n-- 6. Limpieza');
    if (A) await api('DELETE', `/congresos/${A}`, tOrg);
    if (B) await api('DELETE', `/congresos/${B}`, tOrg);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      for (const id of creados.filter(Boolean)) {
        await tx.sesionFavorita.deleteMany({ where: { usuario_id: id } });
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
    ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.7.e listo.`
    : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '));
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\nERROR de ejecucion:', e.message); process.exit(1); });
