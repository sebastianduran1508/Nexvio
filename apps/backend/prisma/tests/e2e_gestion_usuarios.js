// ==========================================================================
// FASE 4 — Prueba END-TO-END de la gestion de usuarios (alta de asistentes).
//
// Valida que el staff pueda dar de alta un asistente y que los permisos por
// rol se respeten:
//   1. El organizador crea un asistente (participante)  -> 201 (o 409 si ya
//      existia de una corrida anterior; ambos se aceptan, el test es idempotente).
//   2. El asistente PUEDE loguearse y ver los congresos de su organizacion.
//   3. El asistente NO puede gestionar usuarios (POST /usuarios -> 403).
//   4. El asistente NO puede crear congresos (POST /congresos -> 403).
//   5. El organizador ve al asistente en GET /usuarios.
//
// Deja creado un asistente FIJO reutilizable para el login de la app movil:
//   email: test.asistente@nexvio.dev   password: asistente123
//
// Requiere backend corriendo y en .env: SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY.
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_gestion_usuarios.js <emailOrganizador> <passOrganizador>
// ==========================================================================

require('dotenv/config');

const [, , emailOrg, passOrg] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

// Asistente de prueba fijo (el que usara la app movil).
const PART_EMAIL = 'test.asistente@nexvio.dev';
const PART_PASS = 'asistente123';

let fallos = 0;
function check(desc, cond) {
  console.log(`${cond ? '✅' : '❌'} ${desc}`);
  if (!cond) fallos++;
}

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login fallo: ' + JSON.stringify(j));
  return j.access_token;
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
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body: data };
}

(async () => {
  const tokenOrg = await login(emailOrg, passOrg);

  // 1) El organizador crea al asistente (201) o ya existia (409).
  const alta = await api('POST', '/usuarios', tokenOrg, {
    nombre: 'Asistente de Prueba',
    email: PART_EMAIL,
    password: PART_PASS,
  });
  check(
    'Alta de asistente -> 201 (o 409 si ya existia)',
    alta.status === 201 || alta.status === 409,
  );
  if (alta.status === 201) {
    check('  El asistente creado tiene rol participante', alta.body?.rol === 'participante');
  }

  // 2) El asistente se loguea y ve los congresos de su organizacion.
  const tokenPart = await login(PART_EMAIL, PART_PASS);
  const congresos = await api('GET', '/congresos', tokenPart);
  check('El asistente puede ver /congresos -> 200', congresos.status === 200);

  // 3) El asistente NO puede gestionar usuarios.
  const intentoAlta = await api('POST', '/usuarios', tokenPart, {
    nombre: 'X', email: 'x@x.com', password: 'xxxxxx',
  });
  check('Asistente NO puede crear usuarios -> 403', intentoAlta.status === 403);

  // 4) El asistente NO puede crear congresos.
  const intentoCongreso = await api('POST', '/congresos', tokenPart, {
    nombre: 'No permitido', fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02',
  });
  check('Asistente NO puede crear congresos -> 403', intentoCongreso.status === 403);

  // 5) El organizador ve al asistente en la lista.
  const lista = await api('GET', '/usuarios', tokenOrg);
  check(
    'El organizador ve al asistente en GET /usuarios',
    lista.status === 200 &&
      Array.isArray(lista.body) &&
      lista.body.some((u) => u.email === PART_EMAIL && u.rol === 'participante'),
  );

  console.log(
    fallos === 0
      ? `\n✅ E2E GESTION USUARIOS OK — asistente de prueba listo:\n   email: ${PART_EMAIL}  password: ${PART_PASS}`
      : `\n❌ ${fallos} verificacion(es) fallaron — revisar arriba`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
