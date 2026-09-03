// ==========================================================================
// FASE 6 — Prueba END-TO-END del networking (interes -> match -> conexion).
//
//   0. Se asegura de que exista un 2do asistente (test.asistente2@nexvio.dev).
//   1. El organizador crea un congreso; los DOS asistentes se inscriben.
//   2. Directorio de A: ve a B con estado 'ninguno'.
//   3. A marca interes en B -> match=false. Directorio: A ve 'enviado', B ve 'recibido'.
//   4. B marca interes en A -> match=true (conexionId).
//   5. misConexiones de A y de B: incluye la conexion con el otro.
//   6. Directorio de ambos: estado 'correspondido' con conexionId.
//   7. Limpieza: borrar el congreso (arrastra el networking).
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_fase6_networking.js <emailOrg> <passOrg> <emailAsis1> <passAsis1>
// ==========================================================================

require('dotenv/config');

const [, , emailOrg, passOrg, emailA, passA] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

// 2do asistente fijo (reutilizable para la demo).
const B_EMAIL = 'test.asistente2@nexvio.dev';
const B_PASS = 'asistente123';

let fallos = 0;
const check = (d, c) => { console.log(`${c ? '✅' : '❌'} ${d}`); if (!c) fallos++; };

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
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

(async () => {
  const tOrg = await login(emailOrg, passOrg);

  // 0) Asegurar 2do asistente (201 o 409 si ya existia)
  await api('POST', '/usuarios', tOrg, { nombre: 'Asistente Dos', email: B_EMAIL, password: B_PASS });
  const tA = await login(emailA, passA);
  const tB = await login(B_EMAIL, B_PASS);

  // 1) Congreso + inscripcion de ambos
  const congreso = await api('POST', '/congresos', tOrg, {
    nombre: 'Congreso E2E Networking', fecha_inicio: '2026-11-20', fecha_fin: '2026-11-20',
  });
  const congresoId = congreso.body?.id;
  const iA = await api('POST', `/congresos/${congresoId}/inscripciones`, tA);
  const iB = await api('POST', `/congresos/${congresoId}/inscripciones`, tB);
  check('Congreso + 2 inscripciones', congreso.status === 201 && iA.status === 201 && iB.status === 201);

  // id de cada asistente (desde el directorio del otro)
  const dirA0 = await api('GET', `/congresos/${congresoId}/networking`, tA);
  const B = dirA0.body?.find((x) => x.usuario);
  const bId = B?.usuario?.id;
  check('Directorio de A ve a B con estado ninguno', dirA0.status === 200 && B?.estado === 'ninguno' && !!bId);

  const dirB0 = await api('GET', `/congresos/${congresoId}/networking`, tB);
  const aId = dirB0.body?.find((x) => x.usuario)?.usuario?.id;

  // 3) A marca interes en B -> no match aun
  const int1 = await api('POST', `/congresos/${congresoId}/intereses`, tA, { receptor_id: bId });
  check('A marca interes en B -> match=false', int1.status === 201 && int1.body?.match === false);

  const dirA1 = await api('GET', `/congresos/${congresoId}/networking`, tA);
  check('A ahora ve a B como enviado', dirA1.body?.find((x) => x.usuario.id === bId)?.estado === 'enviado');
  const dirB1 = await api('GET', `/congresos/${congresoId}/networking`, tB);
  check('B ve a A como recibido', dirB1.body?.find((x) => x.usuario.id === aId)?.estado === 'recibido');

  // 4) B marca interes en A -> MATCH
  const int2 = await api('POST', `/congresos/${congresoId}/intereses`, tB, { receptor_id: aId });
  check('B marca interes en A -> match=true', int2.status === 201 && int2.body?.match === true && !!int2.body?.conexionId);
  const conexionId = int2.body?.conexionId;

  // 5) misConexiones de ambos
  const conexA = await api('GET', '/conexiones', tA);
  const conexB = await api('GET', '/conexiones', tB);
  check('A tiene la conexion (con B)', conexA.body?.some((c) => c.id === conexionId && c.con?.id === bId));
  check('B tiene la conexion (con A)', conexB.body?.some((c) => c.id === conexionId && c.con?.id === aId));

  // 6) Directorio: correspondido con conexionId
  const dirA2 = await api('GET', `/congresos/${congresoId}/networking`, tA);
  const relB = dirA2.body?.find((x) => x.usuario.id === bId);
  check('A ve a B como correspondido con conexionId', relB?.estado === 'correspondido' && relB?.conexionId === conexionId);

  // 7) Limpieza
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tOrg);
  check('Borrar congreso (arrastra networking) -> 200', borrar.status === 200);

  console.log(fallos === 0
    ? '\n✅ E2E FASE 6 (networking) OK — interes, match y conexion'
    : `\n❌ ${fallos} verificacion(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
