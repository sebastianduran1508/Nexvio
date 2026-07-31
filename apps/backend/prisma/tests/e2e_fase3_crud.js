// ==========================================================================
// FASE 3 — Prueba END-TO-END del CRUD del Módulo Congresos.
//
// Recorre el flujo real de un organizador:
//   1. Sin token -> 401 (rutas protegidas).
//   2. Crea un congreso.
//   3. Le arma la agenda (2 sesiones) y registra 1 ponente.
//   4. Asigna el ponente a una sesión (relación M:N).
//   5. Lee el detalle del congreso: debe traer sus 2 sesiones y su ponente.
//   6. (Opcional) Con un token de OTRA organización, ese congreso es INVISIBLE (404).
//   7. Limpia: borra el congreso (deja la BD como estaba -> test re-ejecutable).
//
// Requiere el backend corriendo (npm run start:dev) y en .env:
//   SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Uso (desde apps/backend, en otra terminal):
//   node prisma/tests/e2e_fase3_crud.js <emailOrgA> <passOrgA> [emailOrgB] [passOrgB]
//   (los dos últimos son opcionales: si se dan, prueba el aislamiento entre tenants)
// ==========================================================================

require('dotenv/config');

const [, , emailA, passA, emailB, passB] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

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

// Pequeño ayudante: hace una petición con token y devuelve { status, body }.
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
    /* respuestas sin cuerpo */
  }
  return { status: r.status, body: data };
}

(async () => {
  // 1) Sin token -> 401
  const sinToken = await api('GET', '/congresos', null);
  check('Sin token -> 401', sinToken.status === 401);

  const tokenA = await login(emailA, passA);

  // 2) Crear un congreso
  const crear = await api('POST', '/congresos', tokenA, {
    nombre: 'Congreso E2E Fase 3',
    fecha_inicio: '2026-10-01',
    fecha_fin: '2026-10-03',
  });
  check('Crear congreso -> 201', crear.status === 201 && !!crear.body?.id);
  const congresoId = crear.body?.id;

  // 3) Dos sesiones + un ponente
  const s1 = await api('POST', `/congresos/${congresoId}/sesiones`, tokenA, {
    titulo: 'Sesión inaugural',
    inicio: '2026-10-01T09:00:00Z',
    fin: '2026-10-01T10:00:00Z',
    sala: 'Auditorio A',
  });
  const s2 = await api('POST', `/congresos/${congresoId}/sesiones`, tokenA, {
    titulo: 'Panel de cierre',
    inicio: '2026-10-03T17:00:00Z',
    fin: '2026-10-03T18:00:00Z',
  });
  check('Crear 2 sesiones -> 201', s1.status === 201 && s2.status === 201);

  const p1 = await api('POST', `/congresos/${congresoId}/ponentes`, tokenA, {
    nombre: 'Dra. Ana Ríos',
    bio: 'Cardióloga',
  });
  check('Registrar ponente -> 201', p1.status === 201 && !!p1.body?.id);

  // 4) Asignar el ponente a la sesión inaugural
  const asignar = await api(
    'POST',
    `/sesiones/${s1.body?.id}/ponentes/${p1.body?.id}`,
    tokenA,
  );
  check('Asignar ponente a sesión -> 201', asignar.status === 201);

  // 5) Detalle del congreso: 2 sesiones y 1 ponente
  const detalle = await api('GET', `/congresos/${congresoId}`, tokenA);
  check(
    'Detalle trae 2 sesiones y 1 ponente',
    detalle.status === 200 &&
      detalle.body?.sesiones?.length === 2 &&
      detalle.body?.ponentes?.length === 1,
  );

  // 5b) Validación: un cuerpo mal formado es rechazado con 400
  const malo = await api('POST', '/congresos', tokenA, { nombre: '' });
  check('Cuerpo inválido -> 400', malo.status === 400);

  // 6) Aislamiento entre organizaciones (si se dieron credenciales de Org B)
  if (emailB && passB) {
    const tokenB = await login(emailB, passB);
    const verB = await api('GET', `/congresos/${congresoId}`, tokenB);
    check('Org B NO ve el congreso de Org A -> 404', verB.status === 404);
  } else {
    console.log('ℹ️  (Aislamiento entre tenants: omitido, no se dio Org B)');
  }

  // 7) Limpieza: borrar el congreso -> re-ejecutable
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tokenA);
  check('Borrar congreso -> 200', borrar.status === 200);
  const trasBorrar = await api('GET', `/congresos/${congresoId}`, tokenA);
  check('Tras borrar, el congreso ya no existe -> 404', trasBorrar.status === 404);

  console.log(
    fallos === 0
      ? '\n✅ E2E FASE 3 OK — CRUD de congresos, agenda y ponentes de punta a punta'
      : `\n❌ ${fallos} verificación(es) fallaron — revisar arriba`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
