// ==========================================================================
// PRUEBA DE CIERRE del bloque puente — alta de organizaciones + aislamiento REAL.
//
// Con el admin global, crea DOS organizaciones nuevas (cada una con su
// organizador). Luego, como organizador de la Org A, crea un congreso, y
// comprueba que el organizador de la Org B NO lo ve (aislamiento entre tenants
// con usuarios reales, no con SET ROLE de SQL).
//
// Requiere el backend corriendo (npm run start:dev) y en .env:
//   SUPABASE_URL, SUPABASE_ANON_KEY.
// Y que exista el admin global (correr antes prisma/setup/03_seed_admin.js).
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_onboarding_aislamiento.js <adminEmail> <adminPass>
// ==========================================================================

require('dotenv/config');

const [, , adminEmail, adminPass] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

// Sufijo único para no chocar con slugs/correos de corridas anteriores.
const N = Date.now();

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
  if (!j.access_token) throw new Error('Login falló: ' + JSON.stringify(j));
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
  try {
    data = await r.json();
  } catch {
    /* sin cuerpo */
  }
  return { status: r.status, body: data };
}

async function crearOrg(adminToken, etiqueta) {
  const email = `org.${etiqueta}.${N}@nexvio.dev`;
  const password = 'passw0rd-seguro';
  const res = await api('POST', '/organizaciones', adminToken, {
    nombre: `Organización ${etiqueta} ${N}`,
    slug: `org-${etiqueta}-${N}`,
    organizador: { email, password, nombre: `Organizador ${etiqueta}` },
  });
  return { res, email, password };
}

(async () => {
  const adminToken = await login(adminEmail, adminPass);

  // 1) El admin crea dos organizaciones
  const A = await crearOrg(adminToken, 'a');
  const B = await crearOrg(adminToken, 'b');
  check('Admin crea Org A -> 201', A.res.status === 201);
  check('Admin crea Org B -> 201', B.res.status === 201);

  // Diagnóstico: si falló, mostrar el status y el mensaje real del backend.
  if (A.res.status !== 201) {
    console.log('   ↳ Respuesta real POST /organizaciones:', A.res.status, JSON.stringify(A.res.body));
  }

  // 2) Un rol no-admin NO puede crear organizaciones (403)
  const tokenA = await login(A.email, A.password);
  const intento = await api('POST', '/organizaciones', tokenA, {
    nombre: 'No permitido',
    slug: `no-permitido-${N}`,
    organizador: { email: `x.${N}@nexvio.dev`, password: 'passw0rd-seguro', nombre: 'X' },
  });
  check('Organizador NO puede crear org -> 403', intento.status === 403);

  // 3) El organizador de A crea un congreso
  const tokenB = await login(B.email, B.password);
  const crear = await api('POST', '/congresos', tokenA, {
    nombre: `Congreso privado de A ${N}`,
    fecha_inicio: '2026-11-01',
    fecha_fin: '2026-11-02',
  });
  check('Organizador A crea congreso -> 201', crear.status === 201);
  const congresoId = crear.body?.id;

  // 4) AISLAMIENTO: B no ve el congreso de A ni en el detalle ni en su lista
  const verB = await api('GET', `/congresos/${congresoId}`, tokenB);
  check('Org B NO ve el congreso de A (detalle) -> 404', verB.status === 404);

  const listaB = await api('GET', '/congresos', tokenB);
  const contieneDeA =
    Array.isArray(listaB.body) &&
    listaB.body.some((c) => c.id === congresoId);
  check('Org B NO ve el congreso de A en su lista', !contieneDeA);

  // 5) A sí lo ve (control positivo)
  const verA = await api('GET', `/congresos/${congresoId}`, tokenA);
  check('Org A sí ve su propio congreso -> 200', verA.status === 200);

  // 6) Limpieza del congreso de prueba (las orgs quedan; son baratas de conservar)
  await api('DELETE', `/congresos/${congresoId}`, tokenA);

  console.log(
    fallos === 0
      ? '\n✅ PUENTE OK — alta de organizaciones + aislamiento REAL entre tenants'
      : `\n❌ ${fallos} verificación(es) fallaron — revisar arriba`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
