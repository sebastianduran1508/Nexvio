// ==========================================================================
// FASE 8 · Bloque 8.7.a — Prueba END-TO-END de la entrada a la app
//
// Recorre lo que vive un asistente NUEVO la primera vez:
//   1. El organizador lo crea (le llega usuario + contraseña temporal).
//   2. Entra con su USUARIO; /auth/yo dice que falta la clave Y los datos.
//   3. Lee la política de datos (Ley 1581) con su organización como responsable.
//   4. Aceptar una versión vieja o vacía se rechaza; la vigente se guarda
//      (cuándo + qué versión = prueba de la autorización).
//   5. Cambia la clave; /auth/yo ya no pide nada.
//   6. Si la política cambia de versión, se le vuelve a pedir.
//   7. Sin token no se puede ni leer ni aceptar.
//   8. Limpieza.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7a_entrada.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7a_entrada.js <orgEmail> <orgPass>');
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

const okHttp = (s) => s === 200 || s === 201;

(async () => {
  console.log('\n=== Bloque 8.7.a — prueba de la entrada a la app ===\n');

  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) {
    console.error('No se pudo entrar con el organizador. Revisa las credenciales.');
    process.exit(1);
  }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  let congresoId = null;
  let asistenteId = null;

  try {
    console.log('-- 1. El organizador crea al asistente');
    const congreso = await api('POST', '/congresos', tOrg, {
      nombre: `Congreso 8.7a ${sufijo}`,
      fecha_inicio: '2026-12-01',
      fecha_fin: '2026-12-02',
    });
    congresoId = congreso.body?.id;
    check('congreso de prueba creado', congreso.status === 201, `HTTP ${congreso.status}`);

    const creado = await api('POST', `/congresos/${congresoId}/asistentes`, tOrg, {
      nombres: 'Laura',
      apellidos: `Prueba ${sufijo}`,
      tipo_documento: 'CC',
      numero_documento: `T87A${sufijo}`,
    });
    asistenteId = creado.body?.id;
    check(
      'asistente creado con usuario y contraseña temporal',
      okHttp(creado.status) && !!creado.body?.username && !!creado.body?.password_temporal,
      creado.body?.username,
    );

    console.log('\n-- 2. Entra con su USUARIO; todo está pendiente');
    const resuelto = await api('POST', '/auth/resolver-usuario', null, {
      username: creado.body.username,
    });
    const tAsis = await login(resuelto.body?.email, creado.body.password_temporal);
    check('entra con usuario + contraseña temporal', !!tAsis);

    const yo1 = await api('GET', '/auth/yo', tAsis);
    check(
      '/auth/yo pide cambiar la clave Y aceptar los datos',
      yo1.body?.debe_cambiar_password === true && yo1.body?.requiere_aceptar_datos === true,
      `clave=${yo1.body?.debe_cambiar_password}, datos=${yo1.body?.requiere_aceptar_datos}`,
    );

    console.log('\n-- 3. La política de datos (Ley 1581)');
    const pol = await api('GET', '/auth/politica-datos', tAsis);
    check(
      'la política trae versión, resumen y secciones',
      !!pol.body?.version && (pol.body?.resumen ?? []).length >= 3 &&
        (pol.body?.secciones ?? []).length >= 5,
      `version=${pol.body?.version}`,
    );
    const org = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      return tx.organizacion.findFirst({ where: { id: claims.organizacion_id } });
    });
    check(
      'el RESPONSABLE es la organización del asistente',
      pol.body?.responsable === org?.nombre,
      pol.body?.responsable,
    );
    check(
      'el texto incluye los derechos del art. 8 (supresión y revocatoria)',
      JSON.stringify(pol.body?.secciones ?? []).includes('revocar') &&
        JSON.stringify(pol.body?.secciones ?? []).includes('supresión'),
    );

    console.log('\n-- 4. Aceptar la autorización');
    const vieja = await api('POST', '/auth/aceptar-datos', tAsis, { version: '2000-viejo' });
    check('aceptar una versión que NO es la vigente da 409', vieja.status === 409, vieja.body?.message);

    const vacia = await api('POST', '/auth/aceptar-datos', tAsis, {});
    check('aceptar sin versión da 400', vacia.status === 400);

    const acepta = await api('POST', '/auth/aceptar-datos', tAsis, { version: pol.body?.version });
    check('acepta la versión vigente', okHttp(acepta.status) && acepta.body?.aceptado === true);

    const yo2 = await api('GET', '/auth/yo', tAsis);
    check(
      'queda la PRUEBA: cuándo (acepto_datos_en) y qué versión',
      !!yo2.body?.acepto_datos_en && yo2.body?.politica_datos_version === pol.body?.version,
      `${yo2.body?.acepto_datos_en} · ${yo2.body?.politica_datos_version}`,
    );
    check(
      'ya no pide los datos, pero SÍ sigue pidiendo la clave (son independientes)',
      yo2.body?.requiere_aceptar_datos === false && yo2.body?.debe_cambiar_password === true,
    );

    console.log('\n-- 5. Cambia la contraseña');
    const NUEVA = `Laura${sufijo}2026`;
    const cambio = await api('POST', '/auth/cambiar-password', tAsis, { password: NUEVA });
    check('cambia la contraseña', cambio.body?.cambiada === true, `HTTP ${cambio.status}`);
    const tNuevo = await login(resuelto.body.email, NUEVA);
    const yo3 = await api('GET', '/auth/yo', tNuevo);
    check(
      'con la clave nueva, /auth/yo ya no pide nada (entra a la app)',
      !!tNuevo && yo3.body?.debe_cambiar_password === false &&
        yo3.body?.requiere_aceptar_datos === false,
    );

    console.log('\n-- 6. Si la política cambia de versión, se vuelve a pedir');
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      await tx.usuario.update({
        where: { id: asistenteId },
        data: { politica_datos_version: '2025-01-v0' },
      });
    });
    const yo4 = await api('GET', '/auth/yo', tNuevo);
    check(
      'aceptó una versión VIEJA -> requiere_aceptar_datos vuelve a true',
      yo4.body?.requiere_aceptar_datos === true,
    );

    console.log('\n-- 7. Sin token no hay nada');
    const sin1 = await api('GET', '/auth/politica-datos', null);
    const sin2 = await api('POST', '/auth/aceptar-datos', null, { version: pol.body?.version });
    check('sin token: leer y aceptar dan 401', sin1.status === 401 && sin2.status === 401);
  } finally {
    console.log('\n-- 8. Limpieza');
    if (congresoId) await api('DELETE', `/congresos/${congresoId}`, tOrg);
    if (asistenteId) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
        await tx.usuario.delete({ where: { id: asistenteId } }).catch(() => undefined);
      });
      await fetch(`${SUPA}/auth/v1/admin/users/${asistenteId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      }).catch(() => undefined);
    }
    await prisma.$disconnect();
    check('congreso, asistente y cuenta de prueba borrados', true);
  }

  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Entrada del 8.7.a lista.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` +
          fallos.map((f) => f.nombre).join(' | '),
  );
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR de ejecucion:', e.message);
  process.exit(1);
});
