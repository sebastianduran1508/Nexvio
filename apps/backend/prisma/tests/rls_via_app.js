// ==========================================================================
// Prueba de aislamiento multi-tenant a TRAVÉS del backend real.
// Conecta con el MISMO adapter y el MISMO rol (nexvio_app) que usará la app,
// y verifica que el RLS filtra por organización vía SET LOCAL app.org_id.
//
// Ejecutar desde apps/backend:  node prisma/tests/rls_via_app.js
// Requiere los datos de siembra (Org A - Medicina, Org B - Derecho).
//
// Ajuste (nov-2026): antes exigía que cada org viera EXACTAMENTE 1 congreso
// (como en la Fase 1). Con el tiempo otras pruebas crearon más congresos en
// esas orgs, así que ahora se verifica lo que de verdad importa:
//   - TODO lo que ve A es de A, y TODO lo que ve B es de B;
//   - ninguna fila aparece en las dos;
//   - cada una ve su congreso de siembra;
//   - sin tenant, 0 filas (fail-closed).
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
    return tx.congreso.findMany({ select: { id: true, nombre: true, organizacion_id: true } });
  });
}

(async () => {
  const filasA = await verComoTenant(A);
  const filasB = await verComoTenant(B);
  const a = filasA.map((c) => c.nombre);
  const b = filasB.map((c) => c.nombre);
  const sinTenant = await prisma.$transaction((tx) => tx.congreso.count());

  console.log('Org A (Medicina) ve:', a);
  console.log('Org B (Derecho)  ve:', b);
  console.log('Sin tenant (fail-closed) ve:', sinTenant, 'filas');

  const idsB = new Set(filasB.map((c) => c.id));
  const soloSuyasA = filasA.every((c) => c.organizacion_id === A);
  const soloSuyasB = filasB.every((c) => c.organizacion_id === B);
  const ninguna = filasA.every((c) => !idsB.has(c.id));
  const siembra = a.includes('Congreso de Medicina') && b.includes('Congreso de Derecho');

  console.log('\nComprobaciones:');
  console.log(`  ${soloSuyasA ? '✅' : '❌'} Todo lo que ve A es de A (${filasA.length} filas)`);
  console.log(`  ${soloSuyasB ? '✅' : '❌'} Todo lo que ve B es de B (${filasB.length} filas)`);
  console.log(`  ${ninguna ? '✅' : '❌'} Ninguna fila aparece en las dos organizaciones`);
  console.log(`  ${siembra ? '✅' : '❌'} Cada una ve su congreso de siembra`);
  console.log(`  ${sinTenant === 0 ? '✅' : '❌'} Sin tenant: 0 filas`);

  const ok = soloSuyasA && soloSuyasB && ninguna && siembra && sinTenant === 0;

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
