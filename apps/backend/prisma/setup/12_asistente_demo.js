// ==========================================================================
// Crear un ASISTENTE de prueba en el congreso de un organizador.
//
// Hace lo mismo que Panel → Usuarios → Nuevo asistente: entra como el
// organizador, busca su congreso, crea la cuenta (queda inscrita) y muestra
// el USUARIO. La contraseña temporal queda fija en "asistente123" (más fácil
// para las pruebas). Al primer ingreso la app pedirá cambiarla y aceptar la
// política de datos (como a cualquier asistente).
//
// Las credenciales solo se muestran en pantalla: no se guardan en el repo.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/setup/12_asistente_demo.js <orgEmail> <orgPass> "<Nombres>" "<Apellidos>" ["texto del congreso"]
// Ejemplo:
//   node prisma/setup/12_asistente_demo.js org.educacion@nexvio.dev Nexvio2026! "Andrés" "Gómez Ruiz"
// ==========================================================================
require('dotenv/config');

const [, , orgEmail, orgPass, nombres, apellidos, filtro] = process.argv;
if (!orgEmail || !orgPass || !nombres) {
  console.error('Uso: node prisma/setup/12_asistente_demo.js <orgEmail> <orgPass> "<Nombres>" "<Apellidos>" ["texto del congreso"]');
  process.exit(1);
}
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const CLAVE_DEMO = 'asistente123';

async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

(async () => {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: orgEmail, password: orgPass }),
  });
  const token = (await r.json()).access_token;
  if (!token) { console.error('No se pudo entrar con el organizador. Revisa el correo y la clave.'); process.exit(1); }

  const congresos = (await api('GET', '/congresos', token)).body ?? [];
  const congreso = filtro
    ? congresos.find((c) => c.nombre.toLowerCase().includes(filtro.toLowerCase()))
    : congresos[0];
  if (!congreso) { console.error('No se encontró el congreso.', congresos.map((c) => c.nombre)); process.exit(1); }

  // Documento de prueba único (no choca con nadie).
  const doc = `DEMO-${Date.now().toString().slice(-8)}`;
  const creado = await api('POST', `/congresos/${congreso.id}/asistentes`, token, {
    nombres, apellidos: apellidos || undefined, tipo_documento: 'CC', numero_documento: doc,
  });
  if (creado.status !== 201) { console.error('No se pudo crear:', creado.status, creado.body?.message); process.exit(1); }

  // La temporal aleatoria se reemplaza por una fácil de recordar (sigue siendo
  // temporal: la app la hará cambiar en el primer ingreso).
  let clave = creado.body.password_temporal;
  if (SERVICE) {
    const c = await fetch(`${SUPA}/auth/v1/admin/users/${creado.body.id}`, {
      method: 'PUT',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: CLAVE_DEMO }),
    });
    if (c.ok) clave = CLAVE_DEMO;
    else console.warn('  ⚠️  No se pudo fijar "asistente123"; usa la temporal que sale abajo.');
  }

  console.log(`
  ✅ Asistente creado e inscrito en «${congreso.nombre}»

     Nombre:               ${nombres} ${apellidos ?? ''}
     Usuario (app):        ${creado.body.username}
     Contraseña temporal:  ${clave}

  En la app entra con el USUARIO (sin correo). Te pedirá cambiar la
  contraseña y aceptar la política de datos.
`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
