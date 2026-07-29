// ==========================================================================
// Prueba de aislamiento multi-tenant a TRAVÉS del backend real.
// Conecta con el MISMO adapter y el MISMO rol (nexvio_app) que usará la app,
// y verifica que el RLS filtra por organización vía SET LOCAL app.org_id.
//
// Ejecutar desde apps/backend:  node prisma/tests/rls_via_app.js
// Requiere los datos de siembra (Org A - Medicina, Org B - Derecho).
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Abre una transacción, fija el tenant y devuelve los congresos visibles.
function verComoTenant(orgId) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
    return tx.congreso.findMany({ select: { nombre: true } });
  });
}

(async () => {
  const a = (await verComoTenant(A)).map((c) => c.nombre);
  const b = (await verComoTenant(B)).map((c) => c.nombre);
  const sinTenant = await prisma.$transaction((tx) => tx.congreso.count());

  console.log('Org A (Medicina) ve:', a);
  console.log('Org B (Derecho)  ve:', b);
  console.log('Sin tenant (fail-closed) ve:', sinTenant, 'filas');

  const ok =
    a.length === 1 && a[0] === 'Congreso de Medicina' &&
    b.length === 1 && b[0] === 'Congreso de Derecho' &&
    sinTenant === 0;

  console.log(
    ok
      ? '\n✅ RLS OK — aislamiento correcto a través del backend real (rol nexvio_app)'
      : '\n❌ FALLO — el aislamiento no se comportó como se esperaba',
  );

  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
})().catch(async (e) => {
  console.error('\n❌ ERROR de ejecución:', e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
