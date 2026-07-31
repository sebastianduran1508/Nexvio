// ==========================================================================
// SEED del ADMIN GLOBAL (super-admin de Grupo Studio Sebia) — se corre UNA vez.
//
// El admin global no pertenece a ninguna organización (organizacion_id = NULL) y
// tiene rol 'admin'. Es el único que puede crear organizaciones (POST /organizaciones).
//
// Por qué es un script aparte y NO pasa por el backend/RLS:
//   El RLS de `usuario` exige organizacion_id = app.org_id. Una fila con
//   organizacion_id NULL NO puede insertarse por la ruta normal (fail-closed).
//   Por eso el INSERT va por conexión DIRECTA como `postgres` (DIRECT_URL), que
//   se salta el RLS. La cuenta de login se crea con la Admin API de Supabase.
//
// Requiere en .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_URL.
//
// Uso (desde apps/backend):
//   node prisma/setup/03_seed_admin.js <email> <password> "<nombre>"
// ==========================================================================

require('dotenv/config');
const { Client } = require('pg');

const [, , email, password, nombre] = process.argv;
const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !nombre) {
  console.error('Uso: node prisma/setup/03_seed_admin.js <email> <password> "<nombre>"');
  process.exit(1);
}
if (!SERVICE) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en el .env');
  process.exit(1);
}

async function crearCuentaAuth(email, password) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error('Auth admin API: ' + JSON.stringify(data));
  }
  return data.id ?? data.user?.id;
}

(async () => {
  // 1) Crear la cuenta de login del admin
  const authId = await crearCuentaAuth(email, password);
  console.log('✅ Cuenta de Auth creada. id =', authId);

  // 2) Insertar la fila usuario (org NULL, rol admin) por conexión directa
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO usuario (id, organizacion_id, email, nombre, rol)
       VALUES ($1::uuid, NULL, $2, $3, $4::"Rol")`,
      [authId, email, nombre, 'admin'],
    );
    console.log('✅ Fila usuario (admin global) insertada.');
    console.log('\n🎉 Admin global listo. Ya puede loguearse y crear organizaciones.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
