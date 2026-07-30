// ==========================================================================
// Prueba END-TO-END del backend real:
//   1. Sin token         -> el endpoint responde 401 (protegido).
//   2. Con token de Org A -> devuelve SOLO los congresos de Org A.
//
// Requiere el backend corriendo (npm run start:dev) y en .env:
//   SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Uso (desde apps/backend, en otra terminal):
//   node prisma/tests/e2e_congresos.js test.medicina@nexvio.dev TU_PASSWORD
// ==========================================================================

require('dotenv/config');

const [, , email, password] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login falló: ' + JSON.stringify(j));
  return j.access_token;
}

(async () => {
  // 1) Sin token -> debe ser rechazado
  const r1 = await fetch(`${API}/congresos`);
  console.log('1) Sin token     -> HTTP', r1.status, '(esperado 401)');

  // 2) Con token de Org A -> solo ve lo suyo
  const token = await login(email, password);
  const r2 = await fetch(`${API}/congresos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r2.json();
  console.log('2) Con token OrgA -> HTTP', r2.status);
  console.log('   Congresos visibles:', data);

  const ok =
    r1.status === 401 &&
    r2.status === 200 &&
    Array.isArray(data) &&
    data.length === 1 &&
    data[0].nombre === 'Congreso de Medicina';

  console.log(
    ok
      ? '\n✅ E2E OK — autenticación + aislamiento por tenant, de punta a punta'
      : '\n❌ Revisar — el resultado no fue el esperado',
  );
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
