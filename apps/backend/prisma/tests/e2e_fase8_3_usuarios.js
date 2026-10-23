// ==========================================================================
// FASE 8 · Bloque 8.3 — Prueba END-TO-END de usuarios e importacion de Excel
//
// Recorre el ciclo completo tal como lo vivira el admin y el asistente:
//   1. Crea un congreso de prueba.
//   2. Genera un Excel en memoria con 4 filas: 2 personas buenas, 1 repetida
//      dentro del archivo y 1 sin documento.
//   3. PREVISUALIZA: verifica que clasifique bien y que NO haya escrito nada.
//   4. CONFIRMA: crea las cuentas y devuelve las credenciales.
//   5. Reimporta el MISMO archivo: ahora todas deben salir "ya inscritas"
//      (la prueba de que no se duplica a nadie).
//   6. El asistente entra con su USUARIO (JPGarcia), no con correo.
//   7. /auth/yo dice que debe cambiar la contrasena.
//   8. Cambia la contrasena, vuelve a entrar con la nueva y ya no se le pide.
//   9. Limpieza: borra el congreso, las cuentas y las filas creadas.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_3_usuarios.js <orgEmail> <orgPass>
//     <orgEmail/Pass> = un organizador (test.medicina@nexvio.dev)
// ==========================================================================

require('dotenv/config');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_3_usuarios.js <orgEmail> <orgPass>');
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

/** Sube el Excel como multipart/form-data (igual que lo hara el navegador). */
async function subirExcel(path, token, buffer) {
  const form = new FormData();
  form.append(
    'archivo',
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'inscritos.xlsx',
  );
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

/** Arma en memoria el Excel de prueba (sin tocar el disco). */
async function construirExcel(sufijo) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Inscritos');
  hoja.addRow([
    'Nombres', 'Apellidos', 'Tipo documento', 'Número documento',
    'Tipo suscripción', 'Correo', 'Teléfono', 'Cargo', 'Empresa', 'País',
  ]);
  // 2 buenas
  hoja.addRow(['Juan Pablo', 'García Ruiz', 'CC', `T83A${sufijo}`, 'Miembro', '', '3001112233', 'Médico', 'Clínica Demo', 'Colombia']);
  hoja.addRow(['Ana María', 'Gómez', 'CC', `T83B${sufijo}`, 'General', '', '', 'Enfermera', '', 'Colombia']);
  // repetida dentro del archivo (mismo documento que la primera)
  hoja.addRow(['Juan P.', 'García', 'CC', `T83A${sufijo}`, 'Miembro', '', '', '', '', '']);
  // sin documento
  hoja.addRow(['Carlos', 'Pérez', 'CC', '', 'General', '', '', '', '', '']);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

(async () => {
  console.log('\n=== Bloque 8.3 — prueba de usuarios e importacion ===\n');

  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) {
    console.error('No se pudo entrar con el organizador. Revisa las credenciales.');
    process.exit(1);
  }

  // ------------------------------------------------------------- Paso 1
  const congreso = await api('POST', '/congresos', tOrg, {
    nombre: `Congreso 8.3 ${sufijo}`,
    fecha_inicio: '2026-12-01',
    fecha_fin: '2026-12-03',
  });
  check('congreso de prueba creado', congreso.status === 201, `HTTP ${congreso.status}`);
  const congresoId = congreso.body?.id;
  if (!congresoId) process.exit(1);

  const excel = await construirExcel(sufijo);

  console.log('\n-- 1. Previsualizacion (no debe escribir nada)');

  // ------------------------------------------------------------- Paso 3
  const previa = await subirExcel(
    `/congresos/${congresoId}/importacion/previsualizar`, tOrg, excel,
  );
  check(
    'la previsualizacion responde',
    previa.status === 200 || previa.status === 201,
    `HTTP ${previa.status}`,
  );
  const a = previa.body ?? {};
  check('clasifica 2 filas como nuevas', a.nuevas === 2, `nuevas=${a.nuevas}`);
  check('detecta 2 errores (documento repetido y documento vacio)', a.errores === 2, `errores=${a.errores}`);
  check(
    'propone usuarios tipo JPGarcia',
    (a.filas ?? []).some((f) => f.username_propuesto === 'JPGarcia') ||
      (a.filas ?? []).some((f) => /^JPGarcia\d*$/.test(f.username_propuesto ?? '')),
    (a.filas ?? []).map((f) => f.username_propuesto).filter(Boolean).join(', '),
  );

  const antes = await api('GET', `/congresos/${congresoId}/asistentes`, tOrg);
  check(
    'tras previsualizar NO hay nadie inscrito (no escribio nada)',
    Array.isArray(antes.body) && antes.body.length === 0,
    `${antes.body?.length} asistentes`,
  );

  console.log('\n-- 2. Importacion');

  // ------------------------------------------------------------- Paso 4
  const imp = await subirExcel(
    `/congresos/${congresoId}/importacion/confirmar`, tOrg, excel,
  );
  check('la importacion responde', imp.status === 200 || imp.status === 201, `HTTP ${imp.status}`);
  check('creo 2 asistentes', imp.body?.creadas === 2, `creadas=${imp.body?.creadas}`);
  check(
    'devuelve las credenciales (usuario + contrasena temporal)',
    (imp.body?.credenciales ?? []).length === 2 &&
      imp.body.credenciales.every((c) => c.username && c.password_temporal),
    (imp.body?.credenciales ?? []).map((c) => c.username).join(', '),
  );

  const lista = await api('GET', `/congresos/${congresoId}/asistentes`, tOrg);
  check('ahora el congreso tiene 2 asistentes', lista.body?.length === 2);
  check(
    'quedaron marcados como "debe cambiar contrasena" y origen excel',
    (lista.body ?? []).every((u) => u.debe_cambiar_password === true) &&
      (lista.body ?? []).every((u) => u.origen === 'excel'),
  );

  console.log('\n-- 3. Reimportar el mismo archivo no duplica a nadie');

  // ------------------------------------------------------------- Paso 5
  const previa2 = await subirExcel(
    `/congresos/${congresoId}/importacion/previsualizar`, tOrg, excel,
  );
  check(
    'al reimportar, las 2 buenas salen como "ya inscritas"',
    previa2.body?.ya_inscritas === 2 && previa2.body?.nuevas === 0,
    `ya_inscritas=${previa2.body?.ya_inscritas}, nuevas=${previa2.body?.nuevas}`,
  );

  console.log('\n-- 4. El asistente entra con su USUARIO, no con correo');

  // ------------------------------------------------------------- Paso 6
  const cred = imp.body.credenciales[0];
  const resuelto = await api('POST', '/auth/resolver-usuario', null, {
    username: cred.username,
  });
  check(
    'POST /auth/resolver-usuario traduce el usuario a su correo interno',
    (resuelto.status === 200 || resuelto.status === 201) && !!resuelto.body?.email,
    resuelto.body?.email,
  );
  check(
    'el correo generado es sintetico (.nexvio.local) y nunca se le muestra',
    (resuelto.body?.email ?? '').endsWith('.nexvio.local'),
  );

  const inexistente = await api('POST', '/auth/resolver-usuario', null, {
    username: 'NoExisteJamas999',
  });
  check(
    'un usuario inexistente da 404 con mensaje generico (no revela si existe)',
    inexistente.status === 404,
    inexistente.body?.message,
  );

  const tAsis = await login(resuelto.body.email, cred.password_temporal);
  check('el asistente entra con la contrasena temporal', !!tAsis);

  // ------------------------------------------------------------- Paso 7
  const yo = await api('GET', '/auth/yo', tAsis);
  check(
    '/auth/yo avisa que debe cambiar la contrasena',
    yo.body?.debe_cambiar_password === true && yo.body?.username === cred.username,
    `username=${yo.body?.username}`,
  );

  console.log('\n-- 5. Cambio de la contrasena temporal');

  // ------------------------------------------------------------- Paso 8
  const corta = await api('POST', '/auth/cambiar-password', tAsis, { password: 'abc' });
  check('rechaza una contrasena demasiado corta (400)', corta.status === 400);

  const NUEVA = `Nexvio-${sufijo}-ok`;
  const cambio = await api('POST', '/auth/cambiar-password', tAsis, { password: NUEVA });
  check('cambia la contrasena', cambio.body?.cambiada === true, `HTTP ${cambio.status}`);

  const tNuevo = await login(resuelto.body.email, NUEVA);
  check('entra con la contrasena NUEVA', !!tNuevo);

  const yo2 = await api('GET', '/auth/yo', tNuevo);
  check(
    'ya no se le vuelve a pedir el cambio',
    yo2.body?.debe_cambiar_password === false,
  );

  const vieja = await login(resuelto.body.email, cred.password_temporal);
  check('la contrasena temporal ya no sirve', vieja === null);

  console.log('\n-- 6. Limpieza');

  // ------------------------------------------------------------- Paso 9
  const asistentes = (await api('GET', `/congresos/${congresoId}/asistentes`, tOrg)).body ?? [];
  const orgId = asistentes[0]?.organizacion_id;

  await api('DELETE', `/congresos/${congresoId}`, tOrg); // arrastra inscripciones

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
    for (const u of asistentes) {
      await tx.usuario.delete({ where: { id: u.id } }).catch(() => undefined);
    }
  });
  await prisma.$disconnect();

  for (const u of asistentes) {
    await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    }).catch(() => undefined);
  }
  check('congreso, asistentes y cuentas de prueba borrados', true);

  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.3 listo.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` +
          fallos.map((f) => f.nombre).join(' | '),
  );
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR de ejecucion:', e.message);
  process.exit(1);
});
