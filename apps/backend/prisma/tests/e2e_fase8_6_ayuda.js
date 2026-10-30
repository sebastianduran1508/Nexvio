// ==========================================================================
// FASE 8 · Bloque 8.6 — Prueba de la Ayuda editable (8.6.d)
//
//   1. Por la API: el organizador LEE (y ve los artículos iniciales) pero no
//      puede escribir (403). El superadmin crea un borrador que el organizador
//      no ve, lo publica, lo reordena y lo borra.
//   2. EL SEGUNDO CERROJO (directo a la base, como nexvio_app, igual que el
//      backend): con app.rol = 'organizador' Postgres RECHAZA la escritura,
//      aunque nadie haya pasado por la API; con app.rol = 'admin' la acepta.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_6_ayuda.js <adminEmail> <adminPass> <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , adminEmail, adminPass, orgEmail, orgPass] = process.argv;
if (!adminEmail || !adminPass || !orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_6_ayuda.js <adminEmail> <adminPass> <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

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

/** Escribir en articulo_ayuda directo en la base, con el rol dado (como runInTenant). */
async function insertarComo(rol, id) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', '', true), set_config('app.rol', ${rol}, true)`;
    await tx.$executeRaw`INSERT INTO articulo_ayuda (id, titulo, contenido, actualizado_en)
                         VALUES (${id}::uuid, 'Prueba RLS', 'x', now())`;
  });
}

(async () => {
  const admin = await login(adminEmail, adminPass);
  const org = await login(orgEmail, orgPass);
  if (!admin || !org) throw new Error('No se pudo iniciar sesión (revisa las credenciales)');
  let creado = null;

  try {
    // ---------- 1. Por la API ----------
    const l1 = await api('GET', '/ayuda', org);
    check('El organizador lee la ayuda (artículos iniciales)', l1.status === 200 && l1.body?.length >= 5, `${l1.status} ${l1.body?.length}`);
    const n0 = l1.body?.length ?? 0;

    const prohibido = await api('POST', '/ayuda', org, { titulo: 'X', contenido: 'Y' });
    check('El organizador NO puede crear artículos -> 403', prohibido.status === 403, JSON.stringify(prohibido.body));

    const c = await api('POST', '/ayuda', admin, { titulo: 'Borrador E2E', contenido: '# Hola\n\n- uno', publicado: false });
    creado = c.body;
    check('El superadmin crea un borrador -> 201, de último', c.status === 201 && c.body?.publicado === false, JSON.stringify(c.body));

    const l2 = await api('GET', '/ayuda', org);
    check('El organizador NO ve el borrador', !l2.body?.some((a) => a.id === creado?.id), JSON.stringify(l2.body?.map((a) => a.titulo)));
    const la = await api('GET', '/ayuda', admin);
    check('El superadmin SÍ lo ve', la.body?.some((a) => a.id === creado?.id), JSON.stringify(la.body?.map((a) => a.titulo)));

    const pub = await api('PATCH', `/ayuda/${creado.id}`, admin, { publicado: true, titulo: 'Publicado E2E' });
    const l3 = await api('GET', '/ayuda', org);
    check('Publicado: ahora el organizador lo ve', pub.status === 200 && l3.body?.some((a) => a.titulo === 'Publicado E2E'), JSON.stringify(pub.body));

    const ids = la.body.map((a) => a.id);
    const nuevoOrden = [creado.id, ...ids.filter((x) => x !== creado.id)];
    const ord = await api('POST', '/ayuda/orden', admin, { ids: nuevoOrden });
    check('Reordenar: el nuevo pasa a ser el primero', ord.body?.[0]?.id === creado.id, JSON.stringify(ord.body?.map((a) => a.titulo)));
    // Devolver el orden original.
    await api('POST', '/ayuda/orden', admin, { ids: [...ids.filter((x) => x !== creado.id), creado.id] });

    const b = await api('DELETE', `/ayuda/${creado.id}`, admin);
    const l4 = await api('GET', '/ayuda', org);
    check('Borrar -> 200 y la lista vuelve a como estaba', b.status === 200 && l4.body?.length === n0, `${b.status} ${l4.body?.length}`);
    if (b.status === 200) creado = null;

    // ---------- 2. El segundo cerrojo, directo en la base ----------
    let rechazado = false;
    try {
      await insertarComo('organizador', randomUUID());
    } catch {
      rechazado = true;
    }
    check('En la BASE: con app.rol = organizador, Postgres rechaza escribir', rechazado);

    const idAdmin = randomUUID();
    let aceptado = true;
    try {
      await insertarComo('admin', idAdmin);
    } catch (e) {
      aceptado = false;
      console.log('        ', e.message);
    }
    check('En la BASE: con app.rol = admin, la acepta', aceptado);
    if (aceptado) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.rol', 'admin', true)`;
        await tx.$executeRaw`DELETE FROM articulo_ayuda WHERE id = ${idAdmin}::uuid`;
      });
    }
  } finally {
    if (creado) await api('DELETE', `/ayuda/${creado.id}`, admin);
    await prisma.$disconnect();
  }

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones OK`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => {
  console.error('Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
