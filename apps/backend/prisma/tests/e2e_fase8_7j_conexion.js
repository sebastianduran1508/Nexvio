// ==========================================================================
// FASE 8 · Bloque 8.7.j — Eliminar una conexión (decisión 34, opción A)
//
// Con Ana, Beto y Caro en un congreso:
//   1. Ana y Beto hacen match y se escriben.
//   2. Caro (que NO es de esa conexión) no puede eliminarla -> 404.
//   3. Beto la elimina -> se borran el chat, la conexión y los intereses.
//   4. Ninguno de los dos la ve; el chat y el contacto dan 404.
//   5. Se vuelven a aparecer en Descubrir ("ninguno") y PUEDEN volver a hacer
//      match (con una conexión NUEVA, sin los mensajes viejos).
//   6. El id viejo ya no existe -> 404. Limpieza.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7j_conexion.js <orgEmail> <orgPass>
// ==========================================================================
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7j_conexion.js <orgEmail> <orgPass>');
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
  console.log('\n=== Bloque 8.7.j — Eliminar una conexión ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  let congresoId = null;
  const creados = [];
  try {
    // ---------- Preparación ----------
    congresoId = (await api('POST', '/congresos', tOrg, { nombre: `8.7j ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    const p = {};
    for (const [k, nombre] of [['ana', 'Ana'], ['beto', 'Beto'], ['caro', 'Caro']]) {
      const r = await api('POST', `/congresos/${congresoId}/asistentes`, tOrg, {
        nombres: nombre, apellidos: `Conexion ${sufijo}`, tipo_documento: 'CC', numero_documento: `T7J${k}${sufijo}`,
      });
      creados.push(r.body?.id);
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: r.body?.username })).body?.email;
      p[k] = { id: r.body?.id, token: await login(email, r.body?.password_temporal) };
    }
    const { ana, beto, caro } = p;
    const pol = await api('GET', '/auth/politica-datos', ana.token);
    for (const x of [ana, beto, caro]) await api('POST', '/auth/aceptar-datos', x.token, { version: pol.body?.version });
    check('preparación: congreso con Ana, Beto y Caro (política aceptada)', !!congresoId && !!ana.token && !!beto.token && !!caro.token);

    const interes = (de, a) => api('POST', `/congresos/${congresoId}/intereses`, de.token, { receptor_id: a.id });
    const estadoDe = async (quien, otro) =>
      ((await api('GET', `/congresos/${congresoId}/networking/personas`, quien.token)).body ?? []).find((x) => x.id === otro.id)?.estado;

    console.log('\n-- 1. Match y mensajes');
    await interes(ana, beto);
    const m = await interes(beto, ana);
    const conexionId = m.body?.conexionId;
    check('Ana y Beto hacen match', m.body?.match === true && !!conexionId);
    const msg = await api('POST', `/conexiones/${conexionId}/mensajes`, ana.token, { texto: '¡Hola Beto!' });
    check('Ana le escribe a Beto', okHttp(msg.status), `HTTP ${msg.status}`);

    console.log('\n-- 2. Alguien de fuera');
    const ajena = await api('DELETE', `/conexiones/${conexionId}`, caro.token);
    check('Caro NO puede eliminar la conexión de otros -> 404', ajena.status === 404, `HTTP ${ajena.status}`);
    check('...y la conexión sigue ahí', ((await api('GET', '/conexiones', ana.token)).body ?? []).some((c) => c.id === conexionId));

    console.log('\n-- 3. Beto la elimina');
    const borra = await api('DELETE', `/conexiones/${conexionId}`, beto.token);
    check('Beto elimina la conexión -> 200', okHttp(borra.status) && borra.body?.eliminada === true, `HTTP ${borra.status}`);

    console.log('\n-- 4. Ya no existe para nadie');
    check('Ana ya no la tiene en Conexiones', !((await api('GET', '/conexiones', ana.token)).body ?? []).some((c) => c.id === conexionId));
    check('Beto tampoco', !((await api('GET', '/conexiones', beto.token)).body ?? []).some((c) => c.id === conexionId));
    const chat = await api('GET', `/conexiones/${conexionId}/mensajes`, ana.token);
    const contacto = await api('GET', `/conexiones/${conexionId}/contacto`, ana.token);
    check('el chat y el contacto dan 404', chat.status === 404 && contacto.status === 404, `HTTP ${chat.status}/${contacto.status}`);
    const restos = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      return {
        mensajes: await tx.mensajeChat.count({ where: { conexion_id: conexionId } }),
        intereses: await tx.interesNetworking.count({
          where: { congreso_id: congresoId, OR: [{ emisor_id: ana.id, receptor_id: beto.id }, { emisor_id: beto.id, receptor_id: ana.id }] },
        }),
      };
    }, { maxWait: 15000, timeout: 20000 });
    check('en la base no quedan sus mensajes ni sus "Me interesa"', restos.mensajes === 0 && restos.intereses === 0, JSON.stringify(restos));

    console.log('\n-- 5. Opción A: se vuelven a aparecer y pueden volver a conectar');
    const eA = await estadoDe(ana, beto);
    const eB = await estadoDe(beto, ana);
    check('Ana ve a Beto como nuevo ("ninguno") y Beto a Ana igual', eA === 'ninguno' && eB === 'ninguno', `${eA} / ${eB}`);
    await interes(ana, beto);
    const m2 = await interes(beto, ana);
    check('vuelven a hacer match, con una conexión NUEVA', m2.body?.match === true && !!m2.body?.conexionId && m2.body.conexionId !== conexionId);
    const chat2 = await api('GET', `/conexiones/${m2.body?.conexionId}/mensajes`, ana.token);
    check('...y su chat empieza vacío (los mensajes viejos no vuelven)', chat2.body?.usados === 0, `usados=${chat2.body?.usados}`);

    console.log('\n-- 6. El id viejo');
    const otraVez = await api('DELETE', `/conexiones/${conexionId}`, ana.token);
    check('eliminar otra vez la conexión vieja -> 404', otraVez.status === 404);
  } finally {
    console.log('\n-- 7. Limpieza');
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
    ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Eliminar conexión listo.`
    : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '));
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\nERROR de ejecucion:', e.message); process.exit(1); });
