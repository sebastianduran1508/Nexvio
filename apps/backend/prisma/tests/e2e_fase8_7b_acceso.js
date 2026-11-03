// ==========================================================================
// FASE 8 · Bloque 8.7.b — "El asistente ve SOLO su congreso"
//
// Prepara DOS congresos de la misma organización (A y B) y un asistente
// inscrito solo en A. Comprueba que:
//   1. La lista de congresos le trae solo A (al staff, los dos).
//   2. TODO lo de B le responde 404: detalle, agenda, ponentes, sponsors,
//      marca, avisos, preguntas, encuestas (listar, votar, resultados).
//   3. Lo de A sí funciona.
//   4. Ya no puede inscribirse solo (403) ni darse de baja solo (403).
//   5. No puede entrar a la sala en vivo (Socket.io) de una charla de B.
//   6. Ids basura en la ruta -> 404 (el portero valida antes que la base).
//   7. Si el staff lo inscribe también en B, ahora ve los dos (selector).
//   8. Limpieza.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7b_acceso.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { io } = require('socket.io-client');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');
const { inscribirComoStaff } = require('./_inscribir');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7b_acceso.js <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${detalle ? '  -> ' + detalle : ''}`);
}

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  return j.access_token ?? null;
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

function unirseASala(token, sesionId) {
  return new Promise((res) => {
    const socket = io(API, { auth: { token }, transports: ['websocket'] });
    const fin = (v) => { socket.close(); res(v); };
    socket.on('connect', () => socket.emit('join_sesion', sesionId, (ack) => fin(ack)));
    socket.on('connect_error', () => fin(null));
    setTimeout(() => fin(null), 5000);
  });
}

(async () => {
  console.log('\n=== Bloque 8.7.b — el asistente ve SOLO su congreso ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) {
    console.error('No se pudo entrar con el organizador. Revisa las credenciales.');
    process.exit(1);
  }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));

  let A = null, B = null, asistenteId = null;
  try {
    // ---------- Preparación ----------
    const cA = await api('POST', '/congresos', tOrg, { nombre: `8.7b A ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' });
    const cB = await api('POST', '/congresos', tOrg, { nombre: `8.7b B ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' });
    A = cA.body?.id; B = cB.body?.id;
    const sA = await api('POST', `/congresos/${A}/sesiones`, tOrg, { titulo: 'Charla A', inicio: '2026-12-01T10:00', fin: '2026-12-01T11:00' });
    const sB = await api('POST', `/congresos/${B}/sesiones`, tOrg, { titulo: 'Charla B', inicio: '2026-12-01T10:00', fin: '2026-12-01T11:00' });
    const eB = await api('POST', `/sesiones/${sB.body?.id}/encuestas`, tOrg, { pregunta: '¿B?', opciones: ['Sí', 'No'] });
    const creado = await api('POST', `/congresos/${A}/asistentes`, tOrg, {
      nombres: 'Mario', apellidos: `Acceso ${sufijo}`, tipo_documento: 'CC', numero_documento: `T87B${sufijo}`,
    });
    asistenteId = creado.body?.id;
    const resuelto = await api('POST', '/auth/resolver-usuario', null, { username: creado.body?.username });
    const tAsis = await login(resuelto.body?.email, creado.body?.password_temporal);
    check(
      'preparación: 2 congresos, charlas, encuesta en B y asistente inscrito solo en A',
      !!A && !!B && sA.status === 201 && sB.status === 201 && eB.status === 201 && !!tAsis,
    );
    const sesionA = sA.body.id, sesionB = sB.body.id, encuestaB = eB.body.id;

    console.log('\n-- 1. La lista');
    const lista = await api('GET', '/congresos', tAsis);
    check(
      'el asistente recibe SOLO su congreso (A)',
      lista.status === 200 && lista.body?.length === 1 && lista.body[0].id === A,
      `${lista.body?.length} congreso(s)`,
    );
    const listaOrg = await api('GET', '/congresos', tOrg);
    check(
      'el staff sigue viendo los dos',
      (listaOrg.body ?? []).some((c) => c.id === A) && (listaOrg.body ?? []).some((c) => c.id === B),
    );

    console.log('\n-- 2. Todo lo de B le da 404');
    const rutasB = [
      ['detalle', 'GET', `/congresos/${B}`],
      ['agenda', 'GET', `/congresos/${B}/sesiones`],
      ['ponentes', 'GET', `/congresos/${B}/ponentes`],
      ['sponsors', 'GET', `/congresos/${B}/sponsors`],
      ['marca', 'GET', `/congresos/${B}/personalizacion`],
      ['avisos', 'GET', `/congresos/${B}/avisos`],
      ['preguntas (ver)', 'GET', `/sesiones/${sesionB}/preguntas`],
      ['preguntas (hacer)', 'POST', `/sesiones/${sesionB}/preguntas`, { texto: '¿Me cuelo?' }],
      ['encuestas (ver)', 'GET', `/sesiones/${sesionB}/encuestas`],
      ['encuesta (resultados)', 'GET', `/encuestas/${encuestaB}/resultados`],
      ['encuesta (votar)', 'POST', `/encuestas/${encuestaB}/votar`, { opcion_id: randomUUID() }],
    ];
    const malos = [];
    for (const [nombre, m, ruta, body] of rutasB) {
      const r = await api(m, ruta, tAsis, body);
      if (r.status !== 404) malos.push(`${nombre}=${r.status}`);
    }
    check(`las ${rutasB.length} rutas de B responden 404`, malos.length === 0, malos.join(', ') || undefined);

    const orgB = await api('GET', `/congresos/${B}`, tOrg);
    check('el staff sí abre B (200)', orgB.status === 200);

    console.log('\n-- 3. Lo de A funciona');
    const rutasA = [
      ['detalle', 'GET', `/congresos/${A}`],
      ['agenda', 'GET', `/congresos/${A}/sesiones`],
      ['ponentes', 'GET', `/congresos/${A}/ponentes`],
      ['sponsors', 'GET', `/congresos/${A}/sponsors`],
      ['avisos', 'GET', `/congresos/${A}/avisos`],
      ['encuestas (ver)', 'GET', `/sesiones/${sesionA}/encuestas`],
      ['preguntas (ver)', 'GET', `/sesiones/${sesionA}/preguntas`],
    ];
    const fallanA = [];
    for (const [nombre, m, ruta] of rutasA) {
      const r = await api(m, ruta, tAsis);
      if (r.status !== 200) fallanA.push(`${nombre}=${r.status}`);
    }
    check(`las ${rutasA.length} rutas de A responden 200`, fallanA.length === 0, fallanA.join(', ') || undefined);
    const pregA = await api('POST', `/sesiones/${sesionA}/preguntas`, tAsis, { texto: '¿Pregunta válida?' });
    check('puede preguntar en una charla de A (201)', pregA.status === 201, `HTTP ${pregA.status}`);

    console.log('\n-- 4. Ya no se inscribe ni se da de baja solo');
    const auto = await api('POST', `/congresos/${B}/inscripciones`, tAsis);
    check('inscribirse solo en B -> 403', auto.status === 403, `HTTP ${auto.status}`);
    const mias = await api('GET', '/inscripciones/mias', tAsis);
    const baja = await api('DELETE', `/inscripciones/${mias.body?.[0]?.id}`, tAsis);
    check('darse de baja solo de A -> 403', baja.status === 403, `HTTP ${baja.status}`);

    console.log('\n-- 5. Sala en vivo (Socket.io)');
    const salaB = await unirseASala(tAsis, sesionB);
    const salaA = await unirseASala(tAsis, sesionA);
    check('NO entra a la sala de una charla de B', salaB?.ok === false, JSON.stringify(salaB));
    check('SÍ entra a la sala de una charla de A', salaA?.ok === true, JSON.stringify(salaA));

    console.log('\n-- 6. Ids basura');
    const basura = await api('GET', '/sesiones/no-es-un-id/preguntas', tAsis);
    check('un id que no es UUID -> 404 (no llega a la base)', basura.status === 404, `HTTP ${basura.status}`);

    console.log('\n-- 7. Inscrito en dos congresos (el caso raro)');
    await inscribirComoStaff(B, tAsis);
    const lista2 = await api('GET', '/congresos', tAsis);
    const detB = await api('GET', `/congresos/${B}`, tAsis);
    check(
      'el staff lo inscribe en B: ahora ve los dos y B abre (200)',
      lista2.body?.length === 2 && detB.status === 200,
      `${lista2.body?.length} congreso(s), B=${detB.status}`,
    );
  } finally {
    console.log('\n-- 8. Limpieza');
    if (A) await api('DELETE', `/congresos/${A}`, tOrg);
    if (B) await api('DELETE', `/congresos/${B}`, tOrg);
    if (asistenteId) {
      const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
        await tx.usuario.delete({ where: { id: asistenteId } }).catch(() => undefined);
      });
      await prisma.$disconnect();
      await fetch(`${SUPA}/auth/v1/admin/users/${asistenteId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      }).catch(() => undefined);
    }
    check('congresos, asistente y cuenta de prueba borrados', true);
  }

  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Acceso del 8.7.b listo.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '),
  );
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR de ejecucion:', e.message);
  process.exit(1);
});
