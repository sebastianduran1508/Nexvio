// ==========================================================================
// FASE 8 · Bloque 8.7.h — Lo nuevo del backend para el panel (8.7.i: pruebas)
//
//   1. Editar un congreso (PATCH /congresos/:id), las reglas de las fechas:
//      fin >= inicio · alargar no toca la agenda · mover el inicio SIN correr la
//      agenda -> 409 (y no cambia nada) · CON correr_sesiones las sesiones se
//      mueven conservando la hora del reloj · acortar dejando sesiones fuera ->
//      409 · zona con sesiones -> 409 (sin sesiones sí) · estado · rol.
//   2. Correr la agenda a través de un cambio de horario de verano (New York).
//   3. GET /sesiones/:id: el staff sí; el asistente 403; inexistente 404.
//   4. Preguntas: el staff ve apellidos y foto; el asistente SOLO el nombre.
//   5. GET /congresos trae _count (sesiones e inscritos confirmados) y
//      personalizacion; el asistente sigue viendo solo SU congreso.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7h_panel.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7h_panel.js <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const okHttp = (s) => s === 200 || s === 201;
const iso = (x) => (x ? new Date(x).toISOString() : null);

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
  console.log('\n=== Bloque 8.7.h — Editar congreso, moderación y tarjetas del panel ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  let A = null, B = null, NY = null;
  const creados = [];
  // Las sesiones de A, leídas del detalle (inicio/fin en ISO UTC).
  const sesionesDe = async (id) => {
    const det = (await api('GET', `/congresos/${id}`, tOrg)).body;
    return Object.fromEntries((det?.sesiones ?? []).map((s) => [s.titulo, { inicio: iso(s.inicio), fin: iso(s.fin) }]));
  };
  const fechasDe = async (id) => {
    const det = (await api('GET', `/congresos/${id}`, tOrg)).body;
    return `${det?.fecha_inicio?.slice(0, 10)} → ${det?.fecha_fin?.slice(0, 10)}`;
  };

  try {
    // ---------- Preparación ----------
    // A: congreso en Bogotá (UTC-5, sin horario de verano) del 20 al 22 de diciembre.
    A = (await api('POST', '/congresos', tOrg, { nombre: `8.7h A ${sufijo}`, fecha_inicio: '2026-12-20', fecha_fin: '2026-12-22' })).body?.id;
    B = (await api('POST', '/congresos', tOrg, { nombre: `8.7h B ${sufijo}`, fecha_inicio: '2026-12-20', fecha_fin: '2026-12-22' })).body?.id;
    const s1 = (await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'Apertura', inicio: '2026-12-20T09:00', fin: '2026-12-20T10:00' })).body;
    const s2 = (await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'Cierre', inicio: '2026-12-22T15:00', fin: '2026-12-22T16:00' })).body;
    const p = {};
    for (const [k, nombre] of [['ana', 'Ana'], ['beto', 'Beto']]) {
      const r = await api('POST', `/congresos/${A}/asistentes`, tOrg, { nombres: nombre, apellidos: `Panel ${sufijo}`, tipo_documento: 'CC', numero_documento: `T7H${k}${sufijo}` });
      creados.push(r.body?.id);
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: r.body?.username })).body?.email;
      p[k] = { id: r.body?.id, token: await login(email, r.body?.password_temporal) };
    }
    const { ana, beto } = p;
    check('preparación: congresos A y B, 2 sesiones en A (20 y 22), Ana y Beto inscritos en A',
      !!A && !!B && !!s1?.id && !!s2?.id && !!ana.token && !!beto.token);

    // =====================================================================
    console.log('\n-- 1. Editar el congreso: las reglas de las fechas');
    const alReves = await api('PATCH', `/congresos/${A}`, tOrg, { fecha_fin: '2026-12-19' });
    check('fin antes del inicio -> 400', alReves.status === 400, alReves.body?.message);

    // Caso real 1: "era 20–22 y al final también el 23".
    const antes = await sesionesDe(A);
    const alarga = await api('PATCH', `/congresos/${A}`, tOrg, { fecha_fin: '2026-12-23' });
    const tras = await sesionesDe(A);
    check('alargar el fin (22 -> 23) -> 200 y la agenda NO se mueve',
      okHttp(alarga.status) && JSON.stringify(antes) === JSON.stringify(tras), `${await fechasDe(A)}`);

    // Caso real 2: "ya no es el 20 sino el 23" — sin marcar "Correr la agenda".
    const sinCorrer = await api('PATCH', `/congresos/${A}`, tOrg, { fecha_inicio: '2026-12-23', fecha_fin: '2026-12-26' });
    const msg = String(sinCorrer.body?.message ?? '');
    check('mover el inicio SIN correr la agenda -> 409 que nombra los días que quedan fuera',
      sinCorrer.status === 409 && msg.includes('2026-12-20') && msg.includes('2026-12-22'), msg.slice(0, 90));
    check('...y no cambió nada (transacción): el congreso sigue 20 → 23',
      (await fechasDe(A)) === '2026-12-20 → 2026-12-23', await fechasDe(A));

    // Ahora sí, con "Correr la agenda": +3 días, misma hora del reloj en Bogotá.
    const corre = await api('PATCH', `/congresos/${A}`, tOrg, { fecha_inicio: '2026-12-23', fecha_fin: '2026-12-26', correr_sesiones: true });
    const corridas = await sesionesDe(A);
    check('CON correr_sesiones -> 200', okHttp(corre.status), `HTTP ${corre.status} ${corre.body?.message ?? ''}`);
    check('"Apertura" pasa del 20 09:00 al 23 09:00 (hora Bogotá = 14:00 UTC)',
      corridas['Apertura']?.inicio === '2026-12-23T14:00:00.000Z' && corridas['Apertura']?.fin === '2026-12-23T15:00:00.000Z',
      corridas['Apertura']?.inicio);
    check('"Cierre" pasa del 22 15:00 al 25 15:00 (20:00 UTC)',
      corridas['Cierre']?.inicio === '2026-12-25T20:00:00.000Z', corridas['Cierre']?.inicio);

    // Acortar dejando una sesión fuera (el "Cierre" quedó el 25).
    const acorta = await api('PATCH', `/congresos/${A}`, tOrg, { fecha_fin: '2026-12-24', correr_sesiones: true });
    check('acortar el fin dejando el "Cierre" (25) fuera -> 409, aunque se marque correr (no hay a dónde)',
      acorta.status === 409 && String(acorta.body?.message).includes('2026-12-25'), String(acorta.body?.message ?? '').slice(0, 70));

    // Zona horaria.
    const zonaConSesiones = await api('PATCH', `/congresos/${A}`, tOrg, { zona_horaria: 'America/Mexico_City' });
    check('cambiar la zona de un congreso CON sesiones -> 409', zonaConSesiones.status === 409);
    const zonaSinSesiones = await api('PATCH', `/congresos/${B}`, tOrg, { zona_horaria: 'America/Mexico_City' });
    check('en un congreso SIN sesiones sí se puede (200)', okHttp(zonaSinSesiones.status) && zonaSinSesiones.body?.zona_horaria === 'America/Mexico_City');
    const zonaMala = await api('PATCH', `/congresos/${B}`, tOrg, { zona_horaria: 'Marte/Olympus' });
    check('una zona que no existe -> 400', zonaMala.status === 400);

    // Estado y permisos.
    const publica = await api('PATCH', `/congresos/${A}`, tOrg, { estado: 'publicado' });
    check('el organizador lo publica (estado "publicado")', okHttp(publica.status) && publica.body?.estado === 'publicado');
    const estadoMalo = await api('PATCH', `/congresos/${A}`, tOrg, { estado: 'cerrado' });
    check('un estado que no existe -> 400', estadoMalo.status === 400);
    const campoRaro = await api('PATCH', `/congresos/${A}`, tOrg, { organizacion_id: randomUUID() });
    check('un campo que no está en el DTO (organizacion_id) -> 400', campoRaro.status === 400);
    const asisEdita = await api('PATCH', `/congresos/${A}`, ana.token, { nombre: 'Hackeado' });
    check('un asistente NO puede editar el congreso -> 403', asisEdita.status === 403);

    // =====================================================================
    console.log('\n-- 2. Correr la agenda cruzando un cambio de horario (New York)');
    // En New York el horario de verano terminó el 1-nov-2026: el 29-oct las
    // 09:00 son 13:00 UTC; el 5-nov, las 09:00 son 14:00 UTC.
    NY = (await api('POST', '/congresos', tOrg, {
      nombre: `8.7h NY ${sufijo}`, fecha_inicio: '2026-10-29', fecha_fin: '2026-10-30', zona_horaria: 'America/New_York',
    })).body?.id;
    const sNY = (await api('POST', `/congresos/${NY}/sesiones`, tOrg, { titulo: 'Keynote', inicio: '2026-10-29T09:00', fin: '2026-10-29T10:00' })).body;
    check('preparación: congreso en New York con una charla el 29-oct a las 09:00 (13:00 UTC)',
      iso(sNY?.inicio) === '2026-10-29T13:00:00.000Z', iso(sNY?.inicio));
    const correNY = await api('PATCH', `/congresos/${NY}`, tOrg, { fecha_inicio: '2026-11-05', fecha_fin: '2026-11-06', correr_sesiones: true });
    const kNY = (await sesionesDe(NY))['Keynote'];
    check('corrida 7 días: sigue a las 09:00 del reloj de NY (ahora 14:00 UTC)',
      okHttp(correNY.status) && kNY?.inicio === '2026-11-05T14:00:00.000Z' && kNY?.fin === '2026-11-05T15:00:00.000Z', kNY?.inicio);

    // =====================================================================
    console.log('\n-- 3. GET /sesiones/:id (pantalla de moderación)');
    const det = await api('GET', `/sesiones/${s1.id}`, tOrg);
    check('el staff la obtiene con su congreso (nombre y zona), ponentes, sponsors y ⭐',
      okHttp(det.status) && det.body?.congreso?.id === A && det.body?.congreso?.zona_horaria === 'America/Bogota' &&
      Array.isArray(det.body?.ponentes) && Array.isArray(det.body?.sponsors) && typeof det.body?._count?.favoritas === 'number',
      `HTTP ${det.status}`);
    const detAsis = await api('GET', `/sesiones/${s1.id}`, ana.token);
    check('un asistente (aunque esté inscrito) -> 403', detAsis.status === 403, `HTTP ${detAsis.status}`);
    const noExiste = await api('GET', `/sesiones/${randomUUID()}`, tOrg);
    check('una sesión que no existe -> 404', noExiste.status === 404);
    const sinToken = await api('GET', `/sesiones/${s1.id}`, null);
    check('sin token -> 401', sinToken.status === 401);

    // =====================================================================
    console.log('\n-- 4. Preguntas: qué ve cada quien de la persona que pregunta');
    // Ana tiene foto (la ponemos directo en la base: subirla no es lo que probamos).
    const FOTO = 'https://example.com/fotos/ana-prueba.jpg';
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      await tx.usuario.update({ where: { id: ana.id }, data: { foto_url: FOTO } });
    }, { maxWait: 15000, timeout: 20000 });
    const preg = await api('POST', `/sesiones/${s1.id}/preguntas`, ana.token, { texto: '¿Habrá grabación de la apertura?' });
    check('Ana pregunta (queda pendiente)', okHttp(preg.status) && preg.body?.estado === 'pendiente', `HTTP ${preg.status}`);
    const aprueba = await api('PATCH', `/preguntas/${preg.body?.id}`, tOrg, { estado: 'aprobada' });
    check('el organizador la aprueba', okHttp(aprueba.status));

    const vistaStaff = (await api('GET', `/sesiones/${s1.id}/preguntas`, tOrg)).body ?? [];
    const uStaff = vistaStaff.find((q) => q.id === preg.body?.id)?.usuario ?? {};
    check('el STAFF ve nombre, apellidos y foto', uStaff.nombre === 'Ana' && uStaff.apellidos === `Panel ${sufijo}` && uStaff.foto_url === FOTO,
      JSON.stringify(uStaff));
    const vistaBeto = (await api('GET', `/sesiones/${s1.id}/preguntas`, beto.token)).body ?? [];
    const uBeto = vistaBeto.find((q) => q.id === preg.body?.id)?.usuario ?? null;
    check('otro ASISTENTE (Beto) la ve, pero SOLO con el nombre de pila',
      !!uBeto && JSON.stringify(Object.keys(uBeto)) === JSON.stringify(['nombre']), JSON.stringify(uBeto));
    check('...y en lo que recibe Beto no aparecen ni el apellido ni la foto de Ana',
      !JSON.stringify(vistaBeto).includes(`Panel ${sufijo}`) && !JSON.stringify(vistaBeto).includes(FOTO));

    // =====================================================================
    console.log('\n-- 5. GET /congresos para las tarjetas del panel');
    const lista = (await api('GET', '/congresos', tOrg)).body ?? [];
    const cA = lista.find((c) => c.id === A);
    const cB = lista.find((c) => c.id === B);
    check('A trae _count: 2 sesiones y 2 inscritos confirmados',
      cA?._count?.sesiones === 2 && cA?._count?.inscripciones === 2, JSON.stringify(cA?._count));
    check('B trae _count en cero', cB?._count?.sesiones === 0 && cB?._count?.inscripciones === 0, JSON.stringify(cB?._count));
    check('cada tarjeta trae la clave "personalizacion" (null si aún no tiene marca)', !!cA && 'personalizacion' in cA);
    const detA = (await api('GET', `/congresos/${A}`, tOrg)).body;
    check('el detalle (portada del congreso) trae _count.inscripciones = 2', detA?._count?.inscripciones === 2);
    const listaAna = (await api('GET', '/congresos', ana.token)).body ?? [];
    check('el asistente sigue viendo SOLO su congreso (A, no B ni NY)',
      listaAna.length === 1 && listaAna[0]?.id === A, listaAna.map((c) => c.nombre).join(' · '));
  } finally {
    console.log('\n-- 6. Limpieza');
    for (const id of [A, B, NY]) if (id) await api('DELETE', `/congresos/${id}`, tOrg);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      for (const id of creados.filter(Boolean)) {
        await tx.pregunta.deleteMany({ where: { usuario_id: id } });
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
    ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.7.h listo.`
    : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '));
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\nERROR de ejecucion:', e.message); process.exit(1); });
