// ==========================================================================
// FASE 9 · 9.1 — Limpieza: borra el congreso de carga y sus N asistentes
// (de la base y de Supabase Auth). Correr al terminar todas las mediciones.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/carga/9_limpiar.js <orgEmail> <orgPass>
// ==========================================================================
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { SUPA, SERVICE, login, api, enParalelo, leer } = require('./_comun');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/carga/9_limpiar.js <orgEmail> <orgPass>');
  process.exit(1);
}

(async () => {
  const carga = leer('carga.json');
  const org = await login(orgEmail, orgPass);
  if (!org.token) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const orgId = JSON.parse(Buffer.from(org.token.split('.')[1], 'base64').toString('utf8')).organizacion_id;

  // 1) El congreso (arrastra charlas, encuestas, votos, preguntas e inscripciones).
  const b = await api('DELETE', `/congresos/${carga.congresoId}`, org.token);
  console.log(`  ${b.status === 200 ? 'ok  ' : 'AVISO'} | congreso borrado (HTTP ${b.status})`);

  // 2) Los asistentes de carga (identificados por su documento CARGA<sufijo>…).
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const ids = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
    const us = await tx.usuario.findMany({ where: { numero_documento: { startsWith: `CARGA${carga.sufijo}` } }, select: { id: true } });
    const lista = us.map((u) => u.id);
    await tx.consentimientoDatos.deleteMany({ where: { usuario_id: { in: lista } } });
    await tx.dispositivoPush.deleteMany({ where: { usuario_id: { in: lista } } });
    await tx.usuario.deleteMany({ where: { id: { in: lista } } });
    return lista;
  }, { maxWait: 15000, timeout: 120000 });
  await prisma.$disconnect();
  console.log(`  ok   | ${ids.length} asistentes borrados de la base`);

  // 3) Sus cuentas de Supabase Auth.
  await enParalelo(ids, 10, (id) =>
    fetch(`${SUPA}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } }).catch(() => undefined),
  );
  console.log(`  ok   | ${ids.length} cuentas borradas de Supabase Auth\n`);
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
