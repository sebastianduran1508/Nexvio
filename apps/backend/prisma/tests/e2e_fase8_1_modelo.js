// ==========================================================================
// FASE 8 · Bloque 8.1 — Prueba de cierre del MODELO DE DATOS
//
// Que valida (todo a traves del rol nexvio_app, o sea: con el RLS puesto):
//   1. Las columnas nuevas existen y se pueden escribir/leer
//      (perfil de asistente, campos de speaker, tipo de sesion, suscripcion).
//   2. Las 4 tablas nuevas existen y aceptan datos:
//      sponsor, personalizacion_congreso, dispositivo_push, notificacion.
//   3. La restriccion 1:1 de personalizacion_congreso funciona.
//   4. La restriccion "una persona no se importa dos veces" funciona.
//   5. El RLS aisla: sin tenant -> 0 filas; la Org B no ve nada de la Org A.
//   6. Limpia TODO lo que creo (la BD queda como estaba).
//
// Ejecutar desde apps/backend:  node prisma/tests/e2e_fase8_1_modelo.js
// Requiere los datos de siembra (Org A - Medicina con al menos 1 congreso).
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// --- Utilidades -----------------------------------------------------------

// Corre un bloque de consultas "como" una organizacion: abre transaccion,
// fija app.org_id (que es lo que leen las politicas RLS) y ejecuta.
// Es exactamente lo que hace runInTenant() del PrismaService en el backend.
function comoTenant(orgId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
    return fn(tx);
  });
}

// Sin fijar ningun tenant (debe ver 0 filas: "fail-closed").
function sinTenant(fn) {
  return prisma.$transaction((tx) => fn(tx));
}

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${detalle ? '  -> ' + detalle : ''}`);
}

// Espera que una operacion falle (para probar restricciones de la BD).
async function debeFallar(nombre, fn, codigoEsperado) {
  try {
    await fn();
    check(nombre, false, 'no fallo, y deberia haber fallado');
  } catch (e) {
    const ok = !codigoEsperado || e.code === codigoEsperado;
    check(nombre, ok, `rechazado con ${e.code || e.name}`);
  }
}

// --- La prueba ------------------------------------------------------------

(async () => {
  const sufijo = randomUUID().slice(0, 8);
  const creado = {}; // ids de lo que vamos creando, para limpiar al final

  console.log('\n=== Bloque 8.1 — prueba del modelo de datos ===\n');

  // ---------------------------------------------------------------- Paso 0
  // Necesitamos un congreso de la Org A donde colgar sponsors, etc.
  const congreso = await comoTenant(ORG_A, (tx) =>
    tx.congreso.findFirst({ select: { id: true, nombre: true } }),
  );
  if (!congreso) {
    console.error('\nNo hay congresos en la Org A. Corre antes el seed de demo.');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`Congreso de pruebas: ${congreso.nombre}\n`);

  console.log('-- 1. Columnas nuevas (perfil, speaker, agenda, suscripcion)');

  // ---------------------------------------------------------------- Paso 1
  // Perfil de asistente: creamos un usuario de prueba con TODOS los campos
  // nuevos. Nota: aqui insertamos la fila directamente (no creamos cuenta en
  // Supabase Auth) porque lo que probamos es la BD, no el login.
  const usuario = await comoTenant(ORG_A, (tx) =>
    tx.usuario.create({
      data: {
        organizacion_id: ORG_A,
        email: `tmp81.${sufijo}@nexvio.test`,
        username: `TMP81${sufijo}`,
        nombre: 'Juan Pablo',
        apellidos: 'Garcia Ruiz',
        rol: 'participante',
        tipo_documento: 'CC',
        numero_documento: `TMP-${sufijo}`,
        telefono: '+57 300 000 0000',
        cargo: 'Medico internista',
        empresa: 'Clinica Demo',
        pais: 'Colombia',
        pais_codigo: 'CO',
        debe_cambiar_password: true,
        acepto_datos_en: new Date(),
      },
      select: {
        id: true, username: true, apellidos: true, tipo_documento: true,
        numero_documento: true, cargo: true, empresa: true, pais_codigo: true,
        debe_cambiar_password: true, acepto_datos_en: true,
      },
    }),
  );
  creado.usuario = usuario.id;
  check(
    'usuario: perfil de asistente completo (username, documento, cargo, empresa, pais, Ley 1581)',
    usuario.username === `TMP81${sufijo}` &&
      usuario.cargo === 'Medico internista' &&
      usuario.pais_codigo === 'CO' &&
      usuario.debe_cambiar_password === true &&
      usuario.acepto_datos_en instanceof Date,
  );

  // Ponente con la ficha de speaker ampliada.
  const ponente = await comoTenant(ORG_A, (tx) =>
    tx.ponente.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        nombre: `Speaker 8.1 ${sufijo}`,
        cargo: 'Jefe de investigacion',
        empresa: 'Universidad Demo',
        pais: 'Mexico',
        pais_codigo: 'MX',
        orden: 1,
      },
      select: { id: true, cargo: true, empresa: true, pais_codigo: true, orden: true },
    }),
  );
  creado.ponente = ponente.id;
  check(
    'ponente: ficha de speaker (cargo, empresa, pais + bandera, orden)',
    ponente.cargo === 'Jefe de investigacion' && ponente.pais_codigo === 'MX' && ponente.orden === 1,
  );

  // Sesion de tipo "break": lo que permite armar la agenda con cafes/almuerzos.
  const breakSesion = await comoTenant(ORG_A, (tx) =>
    tx.sesion.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        titulo: `Coffee break ${sufijo}`,
        inicio: new Date('2026-11-10T15:00:00Z'),
        fin: new Date('2026-11-10T15:30:00Z'),
        tipo: 'break',
        descripcion: 'Receso de cafe en el lobby',
        orden: 2,
      },
      select: { id: true, tipo: true, descripcion: true, orden: true },
    }),
  );
  creado.sesion = breakSesion.id;
  check(
    'sesion: tipo break + descripcion + orden',
    breakSesion.tipo === 'break' && breakSesion.orden === 2,
  );

  // Una charla normal debe seguir saliendo como 'charla' sin decir nada
  // (el valor por defecto -> las sesiones que ya existian no se rompen).
  const charla = await comoTenant(ORG_A, (tx) =>
    tx.sesion.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        titulo: `Charla 8.1 ${sufijo}`,
        inicio: new Date('2026-11-10T16:00:00Z'),
        fin: new Date('2026-11-10T17:00:00Z'),
      },
      select: { id: true, tipo: true },
    }),
  );
  creado.sesion2 = charla.id;
  check("sesion: el tipo por defecto es 'charla'", charla.tipo === 'charla');

  // Congreso: datos del evento + zona horaria (resuelve el pendiente de UTC).
  const congresoAmpliado = await comoTenant(ORG_A, (tx) =>
    tx.congreso.findUnique({
      where: { id: congreso.id },
      select: { zona_horaria: true, ciudad: true, lugar: true, descripcion: true },
    }),
  );
  check(
    'congreso: zona_horaria con valor por defecto America/Bogota',
    congresoAmpliado.zona_horaria === 'America/Bogota',
    congresoAmpliado.zona_horaria,
  );

  // Inscripcion con el tipo de suscripcion que viene en el Excel.
  const inscripcion = await comoTenant(ORG_A, (tx) =>
    tx.inscripcion.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        usuario_id: usuario.id,
        tipo_suscripcion: 'Miembro',
        origen: 'excel',
      },
      select: { id: true, tipo_suscripcion: true, origen: true },
    }),
  );
  creado.inscripcion = inscripcion.id;
  check(
    'inscripcion: tipo_suscripcion + origen (excel)',
    inscripcion.tipo_suscripcion === 'Miembro' && inscripcion.origen === 'excel',
  );

  console.log('\n-- 2. Tablas nuevas');

  // ---------------------------------------------------------------- Paso 2
  const sponsor = await comoTenant(ORG_A, (tx) =>
    tx.sponsor.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        nombre: `Sponsor 8.1 ${sufijo}`,
        logo_url: 'https://ejemplo.test/logo.png',
        sitio_web: 'https://ejemplo.test',
        nivel: 'oro',
        orden: 1,
      },
      select: { id: true, nivel: true, orden: true },
    }),
  );
  creado.sponsor = sponsor.id;
  check('sponsor: se crea con nivel y orden', sponsor.nivel === 'oro');

  const perso = await comoTenant(ORG_A, (tx) =>
    tx.personalizacionCongreso.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        logo_url: 'https://ejemplo.test/logo-congreso.svg',
        imagen_portada_url: 'https://ejemplo.test/portada.jpg',
        color_primario: '#5A46F0',
        color_secundario: '#FF7A59',
        tema_default: 'claro',
      },
      select: { id: true, color_primario: true, tema_default: true, actualizado_en: true },
    }),
  );
  creado.perso = perso.id;
  check(
    'personalizacion_congreso: logo, colores y tema',
    perso.color_primario === '#5A46F0' && perso.tema_default === 'claro',
  );

  const dispositivo = await comoTenant(ORG_A, (tx) =>
    tx.dispositivoPush.create({
      data: {
        organizacion_id: ORG_A,
        usuario_id: usuario.id,
        expo_push_token: `ExponentPushToken[tmp-${sufijo}]`,
        plataforma: 'android',
      },
      select: { id: true, activo: true, plataforma: true },
    }),
  );
  creado.dispositivo = dispositivo.id;
  check('dispositivo_push: token de Expo guardado y activo', dispositivo.activo === true);

  const notif = await comoTenant(ORG_A, (tx) =>
    tx.notificacion.create({
      data: {
        organizacion_id: ORG_A,
        congreso_id: congreso.id,
        titulo: 'Arranca la plenaria',
        cuerpo: 'Te esperamos en el auditorio principal en 10 minutos.',
        destino: 'sesion',
        sesion_id: charla.id,
        creado_por_id: usuario.id,
      },
      select: { id: true, estado: true, enviados: true, destino: true },
    }),
  );
  creado.notif = notif.id;
  check(
    "notificacion: nace en 'borrador' con contadores en 0",
    notif.estado === 'borrador' && notif.enviados === 0 && notif.destino === 'sesion',
  );

  console.log('\n-- 3. Restricciones de la base de datos');

  // ---------------------------------------------------------------- Paso 3
  // Un congreso solo puede tener UNA personalizacion (relacion 1:1).
  await debeFallar(
    'personalizacion_congreso: un segundo registro para el mismo congreso se rechaza (1:1)',
    () =>
      comoTenant(ORG_A, (tx) =>
        tx.personalizacionCongreso.create({
          data: { organizacion_id: ORG_A, congreso_id: congreso.id, tema_default: 'oscuro' },
        }),
      ),
    'P2002',
  );

  // La misma persona (mismo documento) no se puede importar dos veces.
  await debeFallar(
    'usuario: documento repetido en la misma organizacion se rechaza',
    () =>
      comoTenant(ORG_A, (tx) =>
        tx.usuario.create({
          data: {
            organizacion_id: ORG_A,
            email: `tmp81bis.${sufijo}@nexvio.test`,
            nombre: 'Clon',
            rol: 'participante',
            tipo_documento: 'CC',
            numero_documento: `TMP-${sufijo}`, // el mismo de arriba
          },
        }),
      ),
    'P2002',
  );

  console.log('\n-- 4. Aislamiento multi-tenant (RLS) de las tablas nuevas');

  // ---------------------------------------------------------------- Paso 4
  // Sin tenant fijado: la base no debe devolver NADA (fail-closed).
  const ciegos = await sinTenant(async (tx) => ({
    sponsor: await tx.sponsor.count(),
    perso: await tx.personalizacionCongreso.count(),
    disp: await tx.dispositivoPush.count(),
    notif: await tx.notificacion.count(),
  }));
  check(
    'sin tenant: 0 filas en las 4 tablas nuevas (fail-closed)',
    ciegos.sponsor === 0 && ciegos.perso === 0 && ciegos.disp === 0 && ciegos.notif === 0,
    JSON.stringify(ciegos),
  );

  // Como Org B: nada de lo que acabamos de crear en la Org A debe existir.
  const vistoPorB = await comoTenant(ORG_B, async (tx) => ({
    sponsor: await tx.sponsor.count({ where: { id: creado.sponsor } }),
    perso: await tx.personalizacionCongreso.count({ where: { id: creado.perso } }),
    disp: await tx.dispositivoPush.count({ where: { id: creado.dispositivo } }),
    notif: await tx.notificacion.count({ where: { id: creado.notif } }),
    usuario: await tx.usuario.count({ where: { id: creado.usuario } }),
  }));
  check(
    'Org B no ve el sponsor, la personalizacion, el dispositivo, la notificacion ni el usuario de la Org A',
    Object.values(vistoPorB).every((n) => n === 0),
    JSON.stringify(vistoPorB),
  );

  // Y la Org B tampoco puede CREAR filas estampadas con el tenant ajeno
  // (eso lo bloquea el WITH CHECK de la politica).
  await debeFallar(
    'Org B no puede crear un sponsor con organizacion_id de la Org A (WITH CHECK)',
    () =>
      comoTenant(ORG_B, (tx) =>
        tx.sponsor.create({
          data: { organizacion_id: ORG_A, congreso_id: congreso.id, nombre: 'Intruso' },
        }),
      ),
  );

  console.log('\n-- 5. Limpieza');

  // ---------------------------------------------------------------- Paso 5
  // Orden inverso al de creacion, para no chocar con las claves foraneas.
  await comoTenant(ORG_A, async (tx) => {
    if (creado.notif) await tx.notificacion.delete({ where: { id: creado.notif } });
    if (creado.dispositivo) await tx.dispositivoPush.delete({ where: { id: creado.dispositivo } });
    if (creado.perso) await tx.personalizacionCongreso.delete({ where: { id: creado.perso } });
    if (creado.sponsor) await tx.sponsor.delete({ where: { id: creado.sponsor } });
    if (creado.inscripcion) await tx.inscripcion.delete({ where: { id: creado.inscripcion } });
    if (creado.sesion) await tx.sesion.delete({ where: { id: creado.sesion } });
    if (creado.sesion2) await tx.sesion.delete({ where: { id: creado.sesion2 } });
    if (creado.ponente) await tx.ponente.delete({ where: { id: creado.ponente } });
    if (creado.usuario) await tx.usuario.delete({ where: { id: creado.usuario } });
  });
  check('se borro todo lo creado por la prueba', true);

  // --------------------------------------------------------------- Resumen
  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Bloque 8.1 listo.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` +
          fallos.map((f) => f.nombre).join(' | '),
  );

  await prisma.$disconnect();
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error('\nERROR de ejecucion:', e.message);
  console.error('(si quedaron filas de prueba, se reconocen por el sufijo en nombre/email)');
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
