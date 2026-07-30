// ==========================================================================
// Helper de prueba: hace login contra Supabase Auth y muestra los CLAIMS del JWT.
// Sirve para verificar que el Custom Access Token Hook inyecta organizacion_id
// y rol en el token.
//
// Uso (desde apps/backend):
//   node prisma/tests/get_token.js test.medicina@nexvio.dev TU_PASSWORD
//
// Requiere en .env: SUPABASE_URL y SUPABASE_ANON_KEY.
// Además imprime el access_token completo por si se quiere reutilizar.
// ==========================================================================

require('dotenv/config');

const [, , email, password] = process.argv;
const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

if (!email || !password) {
  console.error('Uso: node prisma/tests/get_token.js <email> <password>');
  process.exit(1);
}

(async () => {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (!data.access_token) {
    console.error('❌ No se obtuvo token. Respuesta:', data);
    process.exit(1);
  }

  // El JWT tiene 3 partes separadas por ".": header.payload.signature
  const payload = JSON.parse(
    Buffer.from(data.access_token.split('.')[1], 'base64').toString('utf8'),
  );

  console.log('\n=== CLAIMS DEL JWT ===');
  console.log('organizacion_id:', payload.organizacion_id ?? '(ausente)');
  console.log('rol            :', payload.rol ?? '(ausente)');
  console.log('sub (user id)  :', payload.sub);
  console.log('\n=== Payload completo ===');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n=== access_token (para reutilizar en pruebas) ===');
  console.log(data.access_token);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
