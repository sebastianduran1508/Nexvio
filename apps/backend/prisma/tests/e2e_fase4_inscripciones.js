// ==========================================================================
// FASE 4 — Prueba END-TO-END del Modulo Inscripciones.
//
// Recorre el flujo del asistente (aqui probado con un usuario del tenant):
//   1. Sin token -> 401.
//   2. Se crea un congreso (para tener a que inscribirse).
//   3. El usuario se INSCRIBE -> 201, estado 'confirmada'.
//   4. Inscribirse de nuevo -> 409 (ya inscrito).
//   5. GET /inscripciones/mias -> trae ese congreso.
//   6. GET /congresos/:id/inscripciones (staff) -> 1 inscrito con mi email.
//   7. DELETE /inscripciones/:id (cancelar) -> 200; luego 'mias' ya NO lo trae.
//   8. Re-inscribirse -> 201 (reactiva la cancelada); 'mias' lo vuelve a traer.
//   9. (Opcional) Aislamiento: Org B NO puede inscribirse al congreso de A (404)
//      ni ver su lista de inscritos (404).
//  10. Limpieza: borra el congreso (arrastra sus inscripciones) -> re-ejecutable.
//
// Requiere el backend corriendo (npm run start:dev) y en .env:
//   SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Uso (desde apps/backend, en otra terminal):
//   node prisma/tests/e2e_fase4_inscripciones.js <emailOrgA> <passOrgA> [emailOrgB] [passOrgB]
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
  // 1) Sin token -> 401
  const sinToken = await api('GET', '/inscripciones/mias', null);
  check('Sin token -> 401', sinToken.status === 401);

  const tokenA = await login(emailA, passA);

  // 2) Crear un congreso al que inscribirse
  const crear = await api('POST', '/congresos', tokenA, {
    nombre: 'Congreso E2E Fase 4',
    fecha_inicio: '2026-11-01',
    fecha_fin: '2026-11-02',
  });
  check('Crear congreso -> 201', crear.status === 201 && !!crear.body?.id);
  const congresoId = crear.body?.id;

  // 3) Inscribirse
  const insc = await api('POST', `/congresos/${congresoId}/inscripciones`, tokenA);
  check(
    'Inscribirse -> 201 y estado confirmada',
    insc.status === 201 && insc.body?.estado === 'confirmada',
  );
  const inscId = insc.body?.id;

  // 4) Inscribirse de nuevo -> 409
  const dup = await api('POST', `/congresos/${congresoId}/inscripciones`, tokenA);
  check('Inscribirse de nuevo -> 409', dup.status === 409);

  // 5) Mis inscripciones incluyen el congreso
  const mias1 = await api('GET', '/inscripciones/mias', tokenA);
  check(
    'GET /inscripciones/mias trae el congreso',
    mias1.status === 200 &&
      Array.isArray(mias1.body) &&
      mias1.body.some((i) => i.congreso?.id === congresoId),
  );

  // 6) El staff ve la lista de inscritos (1, con mi email)
  const inscritos = await api('GET', `/congresos/${congresoId}/inscripciones`, tokenA);
  check(
    'Lista de inscritos -> 1 con email',
    inscritos.status === 200 &&
      inscritos.body?.length === 1 &&
      typeof inscritos.body[0]?.usuario?.email === 'string',
  );

  // 7) Cancelar -> 'mias' ya no lo trae
  const cancelar = await api('DELETE', `/inscripciones/${inscId}`, tokenA);
  check('Cancelar inscripcion -> 200', cancelar.status === 200);
  const mias2 = await api('GET', '/inscripciones/mias', tokenA);
  check(
    'Tras cancelar, no aparece en mias',
    mias2.status === 200 && !mias2.body.some((i) => i.congreso?.id === congresoId),
  );

  // 8) Re-inscribirse reactiva la cancelada
  const reinsc = await api('POST', `/congresos/${congresoId}/inscripciones`, tokenA);
  check('Re-inscribirse -> 201 (reactiva)', reinsc.status === 201);
  const mias3 = await api('GET', '/inscripciones/mias', tokenA);
  check(
    'Vuelve a aparecer en mias',
    mias3.status === 200 && mias3.body.some((i) => i.congreso?.id === congresoId),
  );

  // 9) Aislamiento entre organizaciones (si se dio Org B)
  if (emailB && passB) {
    const tokenB = await login(emailB, passB);
    const inscB = await api('POST', `/congresos/${congresoId}/inscripciones`, tokenB);
    check('Org B NO puede inscribirse al congreso de A -> 404', inscB.status === 404);
    const listaB = await api('GET', `/congresos/${congresoId}/inscripciones`, tokenB);
    check('Org B NO ve los inscritos de A -> 404', listaB.status === 404);
  } else {
    console.log('ℹ️  (Aislamiento entre tenants: omitido, no se dio Org B)');
  }

  // 10) Limpieza: borrar el congreso (arrastra las inscripciones)
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tokenA);
  check('Borrar congreso -> 200', borrar.status === 200);

  console.log(
    fallos === 0
      ? '\n✅ E2E FASE 4 OK — inscribirse, ver mias, lista staff, cancelar/reactivar y aislamiento'
      : `\n❌ ${fallos} verificacion(es) fallaron — revisar arriba`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
