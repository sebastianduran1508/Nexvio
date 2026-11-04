// ==========================================================================
// Ayudante de pruebas (Bloque 8.7.b): inscribe a un asistente "como lo haría
// el staff" (en la vida real: el Excel que importa el organizador).
//
// Desde el 8.7.b el asistente YA NO puede inscribirse solo (POST
// /congresos/:id/inscripciones da 403 a un participante). Las pruebas viejas
// (Fases 5, 6 y 8.6) usaban eso para preparar sus datos; ahora llaman aquí.
// Escribe directo en la base, dentro del tenant del asistente (RLS activo).
// ==========================================================================
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function inscribirComoStaff(congresoId, tokenAsistente) {
  const claims = JSON.parse(Buffer.from(tokenAsistente.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
      await tx.inscripcion.upsert({
        where: { congreso_id_usuario_id: { congreso_id: congresoId, usuario_id: claims.sub } },
        create: {
          organizacion_id: claims.organizacion_id,
          congreso_id: congresoId,
          usuario_id: claims.sub,
          origen: 'manual',
        },
        update: { estado: 'confirmada' },
      });
      // 8.7.c: el networking solo muestra a quien AUTORIZÓ sus datos. En la vida
      // real lo hace la persona en la app al primer ingreso; aquí lo simulamos.
      await tx.usuario.updateMany({
        where: { id: claims.sub, acepto_datos_en: null },
        data: { acepto_datos_en: new Date(), politica_datos_version: 'prueba-e2e' },
      });
    }, { maxWait: 15000, timeout: 20000 }); // misma paciencia que runInTenant
    return { status: 201 };
  } catch (e) {
    console.error('  (no se pudo inscribir al asistente:', e.message, ')');
    return { status: 500 };
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { inscribirComoStaff };
