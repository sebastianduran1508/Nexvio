// ==========================================================================
// FASE 8 · Bloque 8.2 — Prueba END-TO-END del superadmin
//
// Lo que valida (contra el backend REAL, con start:dev corriendo):
//   1. Las dos ventanillas (/superadmin/organizaciones y /superadmin/panorama)
//      responden al admin y estan CERRADAS para un organizador (403).
//   2. Suplantacion de tenant: el superadmin sin cabecera no puede operar (400);
//      con la cabecera de la Org A ve lo de la Org A; con la de la Org B, lo de
//      la Org B. Y lo de una NO aparece en la otra.
//   3. La cabecera se IGNORA para quien no es admin: un organizador que manda
//      X-Organizacion-Id de otra organizacion sigue viendo SOLO la suya.
//   4. El superadmin crea un congreso dentro de la Org B (el objetivo del 8.2)
//      y queda aislado de la Org A.
//   5. Solo el superadmin puede crear organizadores ("admin del congreso");
//      un organizador que lo intente recibe 403.
//   6. Limpia lo que creo (congreso + organizador de prueba).
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_2_superadmin.js <adminEmail> <adminPass> <orgEmail> <orgPass>
//
//   <adminEmail/Pass> = el superadmin global  (admin@nexvio.dev)
//   <orgEmail/Pass>   = un organizador normal (test.medicina@nexvio.dev)
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , adminEmail, adminPass, orgEmail, orgPass] = process.argv;
if (!adminEmail || !adminPass || !orgEmail || !orgPass) {
  console.error(
    'Uso: node prisma/tests/e2e_fase8_2_superadmin.js <adminEmail> <adminPass> <orgEmail> <orgPass>',
  );
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
  if (!j.access_token) throw new Error(`Login de ${email} fallo: ` + JSON.stringify(j));
  return j.access_token;
}

/**
 * Llama a la API. `orgId` (opcional) viaja como la cabecera X-Organizacion-Id,
 * que es el mecanismo de suplantacion de tenant del Bloque 8.2.
 */
async function api(method, path, token, { body, orgId } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'X-Organizacion-Id': orgId } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body: data };
}

/** Lee los claims de un JWT sin verificarlo (solo para saber la org del test). */
function claims(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
}

(async () => {
  console.log('\n=== Bloque 8.2 — prueba del superadmin ===\n');

  const tAdmin = await login(adminEmail, adminPass);
  const tOrg = await login(orgEmail, orgPass);
  const orgA = claims(tOrg).organizacion_id;
  check('el organizador de prueba tiene organizacion en su token', !!orgA, orgA);

  console.log('\n-- 1. Las dos ventanillas del superadmin');

  const lista = await api('GET', '/superadmin/organizaciones', tAdmin);
  check(
    'GET /superadmin/organizaciones responde al admin',
    lista.status === 200 && Array.isArray(lista.body),
    `HTTP ${lista.status}, ${lista.body?.length ?? 0} organizaciones`,
  );

  const pano = await api('GET', '/superadmin/panorama', tAdmin);
  check(
    'GET /superadmin/panorama responde al admin',
    pano.status === 200 && Array.isArray(pano.body),
    `HTTP ${pano.status}, ${pano.body?.length ?? 0} congresos`,
  );
  if (Array.isArray(pano.body) && pano.body.length > 0) {
    const f = pano.body[0];
    check(
      'el panorama trae organizacion, congreso, en_curso y conteos',
      'organizacion' in f && 'congreso' in f && 'en_curso' in f &&
        typeof f.total_inscritos === 'number' && typeof f.total_sesiones === 'number',
      JSON.stringify({ org: f.organizacion, congreso: f.congreso, en_curso: f.en_curso }),
    );
  }

  const listaOrg = await api('GET', '/superadmin/organizaciones', tOrg);
  check(
    'un organizador NO puede usar las rutas del superadmin (403)',
    listaOrg.status === 403,
    `HTTP ${listaOrg.status}`,
  );

  // Necesitamos una SEGUNDA organizacion para probar el cambio de tenant.
  const orgs = Array.isArray(lista.body) ? lista.body : [];
  const otra = orgs.find((o) => o.id !== orgA);
  if (!otra) {
    console.error('\nSe necesitan al menos 2 organizaciones. Corre antes e2e_onboarding_aislamiento.js');
    process.exit(1);
  }
  const orgB = otra.id;
  console.log(`\n   Org A (del organizador): ${orgA}`);
  console.log(`   Org B (otra):            ${orgB}  "${otra.nombre}"`);

  console.log('\n-- 2. Suplantacion de tenant');

  const sinCabecera = await api('GET', '/congresos', tAdmin);
  check(
    'el superadmin SIN elegir organizacion no puede operar (400)',
    sinCabecera.status === 400,
    sinCabecera.body?.message,
  );

  const comoA = await api('GET', '/congresos', tAdmin, { orgId: orgA });
  const propios = await api('GET', '/congresos', tOrg);
  check(
    'el superadmin con la cabecera de la Org A ve EXACTAMENTE lo mismo que el organizador de la Org A',
    comoA.status === 200 &&
      propios.status === 200 &&
      JSON.stringify(comoA.body.map((c) => c.id).sort()) ===
        JSON.stringify(propios.body.map((c) => c.id).sort()),
    `${comoA.body?.length} congresos`,
  );

  const comoB = await api('GET', '/congresos', tAdmin, { orgId: orgB });
  const idsA = new Set((comoA.body || []).map((c) => c.id));
  const hayFuga = (comoB.body || []).some((c) => idsA.has(c.id));
  check(
    'al cambiar a la Org B NO se cuela ningun congreso de la Org A',
    comoB.status === 200 && !hayFuga,
    `Org B ve ${comoB.body?.length} congresos`,
  );

  console.log('\n-- 3. La cabecera se ignora para quien no es admin');

  const orgIntruso = await api('GET', '/congresos', tOrg, { orgId: orgB });
  check(
    'un organizador que manda la cabecera de OTRA organizacion sigue viendo solo la suya',
    orgIntruso.status === 200 &&
      JSON.stringify(orgIntruso.body.map((c) => c.id).sort()) ===
        JSON.stringify(propios.body.map((c) => c.id).sort()),
  );

  console.log('\n-- 4. El superadmin crea un congreso en la Org B');

  const sufijo = randomUUID().slice(0, 8);
  const creado = await api('POST', '/congresos', tAdmin, {
    orgId: orgB,
    body: {
      nombre: `Congreso 8.2 ${sufijo}`,
      fecha_inicio: '2026-11-20',
      fecha_fin: '2026-11-22',
    },
  });
  check(
    'POST /congresos como superadmin dentro de la Org B',
    creado.status === 201 && creado.body?.organizacion_id === orgB,
    `HTTP ${creado.status}`,
  );
  const congresoId = creado.body?.id;

  if (congresoId) {
    const enB = await api('GET', `/congresos/${congresoId}`, tAdmin, { orgId: orgB });
    const enA = await api('GET', `/congresos/${congresoId}`, tAdmin, { orgId: orgA });
    check('el congreso nuevo se ve desde la Org B', enB.status === 200);
    check(
      'ese mismo congreso NO existe para la Org A (404)',
      enA.status === 404,
      `HTTP ${enA.status}`,
    );
    const paraElOrganizador = await api('GET', `/congresos/${congresoId}`, tOrg);
    check(
      'ni para el organizador de la Org A (404)',
      paraElOrganizador.status === 404,
      `HTTP ${paraElOrganizador.status}`,
    );
  }

  console.log('\n-- 5. Quien puede crear organizadores ("admin del congreso")');

  const emailNuevo = `tmp82.${sufijo}@nexvio.test`;
  const nuevoOrganizador = await api('POST', '/usuarios', tAdmin, {
    orgId: orgB,
    body: {
      nombre: 'Admin de Congreso 8.2',
      email: emailNuevo,
      password: 'temporal123',
      rol: 'organizador',
    },
  });
  check(
    'el superadmin SI puede crear un organizador en la Org B',
    nuevoOrganizador.status === 201 && nuevoOrganizador.body?.rol === 'organizador',
    `HTTP ${nuevoOrganizador.status}`,
  );
  const usuarioId = nuevoOrganizador.body?.id;

  const intento = await api('POST', '/usuarios', tOrg, {
    body: {
      nombre: 'Organizador pirata',
      email: `pirata.${sufijo}@nexvio.test`,
      password: 'temporal123',
      rol: 'organizador',
    },
  });
  check(
    'un organizador NO puede fabricar otros organizadores (403)',
    intento.status === 403,
    `HTTP ${intento.status}`,
  );

  console.log('\n-- 6. Limpieza');

  // Borramos el congreso por la API (el superadmin, dentro de la Org B).
  if (congresoId) {
    const del = await api('DELETE', `/congresos/${congresoId}`, tAdmin, { orgId: orgB });
    check('congreso de prueba borrado', del.status === 200, `HTTP ${del.status}`);
  }

  // Y el organizador de prueba: fila en la BD + cuenta de Auth.
  if (usuarioId) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${orgB}, true)`;
      await tx.usuario.delete({ where: { id: usuarioId } });
    });
    await prisma.$disconnect();

    const r = await fetch(`${SUPA}/auth/v1/admin/users/${usuarioId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    check('organizador de prueba borrado (fila + cuenta de Auth)', r.ok, `HTTP ${r.status}`);
  }

  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.2 listo.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` +
          fallos.map((f) => f.nombre).join(' | '),
  );
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR de ejecucion:', e.message);
  process.exit(1);
});
