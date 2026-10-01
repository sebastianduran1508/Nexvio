// ==========================================================================
// Utilidad de desarrollo — cambiar la contrasena de una cuenta de Supabase Auth
//
// Supabase guarda las contrasenas HASHEADAS: no se pueden leer, solo
// reemplazar. Este script usa la Admin API (clave service_role) para buscar la
// cuenta por correo y ponerle una contrasena nueva.
//
// Se reutilizara en el Bloque 8.3: cuando el admin importe el Excel, cada
// asistente recibe una contrasena TEMPORAL generada asi.
//
// Uso (desde apps/backend):
//   node prisma/setup/09_cambiar_password.js <email> <passwordNueva>
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en el .env. NUNCA usar desde el frontend.
// ==========================================================================

require('dotenv/config');

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node prisma/setup/09_cambiar_password.js <email> <passwordNueva>');
  process.exit(1);
}
if (password.length < 6) {
  console.error('Supabase exige al menos 6 caracteres.');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !SERVICE) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env');
  process.exit(1);
}

const headers = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
};

(async () => {
  // 1) Buscar la cuenta por correo (la Admin API filtra con ?email=).
  const busca = await fetch(
    `${SUPA}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers },
  );
  const datos = await busca.json();
  if (!busca.ok) {
    console.error('No se pudo consultar Auth:', JSON.stringify(datos));
    process.exit(1);
  }

  const usuarios = datos.users ?? datos ?? [];
  const usuario = usuarios.find(
    (u) => (u.email || '').toLowerCase() === email.toLowerCase(),
  );
  if (!usuario) {
    console.error(`No existe ninguna cuenta con el correo ${email}.`);
    console.error('Cuentas encontradas:', usuarios.map((u) => u.email).join(', ') || '(ninguna)');
    process.exit(1);
  }

  // 2) Reemplazar la contrasena.
  const cambio = await fetch(`${SUPA}/auth/v1/admin/users/${usuario.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
  });
  const res = await cambio.json();
  if (!cambio.ok) {
    console.error('No se pudo cambiar la contrasena:', JSON.stringify(res));
    process.exit(1);
  }

  console.log(`Listo. ${email} (uid ${usuario.id}) ya tiene la contrasena nueva.`);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
