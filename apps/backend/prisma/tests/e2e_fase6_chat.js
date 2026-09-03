// ==========================================================================
// FASE 6 — Prueba END-TO-END del chat (mensajes en vivo + limite).
//
//   1. Setup: 2 asistentes hacen match en un congreso -> conexionId.
//   2. Un tercero (organizador, no es de la conexion) NO ve los mensajes -> 404.
//   3. B abre socket y se une a la sala de la conexion (ack ok).
//   4. A envia un mensaje -> el socket de B recibe 'mensajes:cambio'.
//   5. GET mensajes (como B): trae el mensaje, usados=1, limite=20.
//   6. Limite: se llena hasta 20 mensajes; el 21 -> 400.
//   7. Limpieza.
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_fase6_chat.js <emailOrg> <passOrg> <emailAsis1> <passAsis1>
// ==========================================================================

require('dotenv/config');
const { io } = require('socket.io-client');

const [, , emailOrg, passOrg, emailA, passA] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const B_EMAIL = 'test.asistente2@nexvio.dev';
const B_PASS = 'asistente123';

let fallos = 0;
const check = (d, c) => { console.log(`${c ? '✅' : '❌'} ${d}`); if (!c) fallos++; };

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login fallo: ' + JSON.stringify(j));
  return j.access_token;
}
async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}
function esperarEvento(socket, ev, ms = 4000) {
  return new Promise((res) => { const t = setTimeout(() => res(false), ms); socket.once(ev, () => { clearTimeout(t); res(true); }); });
}

(async () => {
  const tOrg = await login(emailOrg, passOrg);
  await api('POST', '/usuarios', tOrg, { nombre: 'Asistente Dos', email: B_EMAIL, password: B_PASS });
  const tA = await login(emailA, passA);
  const tB = await login(B_EMAIL, B_PASS);

  // 1) Match
  const congreso = await api('POST', '/congresos', tOrg, {
    nombre: 'Congreso E2E Chat', fecha_inicio: '2026-11-21', fecha_fin: '2026-11-21',
  });
  const congresoId = congreso.body?.id;
  await api('POST', `/congresos/${congresoId}/inscripciones`, tA);
  await api('POST', `/congresos/${congresoId}/inscripciones`, tB);
  const dirA = await api('GET', `/congresos/${congresoId}/networking`, tA);
  const bId = dirA.body?.find((x) => x.usuario)?.usuario?.id;
  const dirB = await api('GET', `/congresos/${congresoId}/networking`, tB);
  const aId = dirB.body?.find((x) => x.usuario)?.usuario?.id;
  await api('POST', `/congresos/${congresoId}/intereses`, tA, { receptor_id: bId });
  const match = await api('POST', `/congresos/${congresoId}/intereses`, tB, { receptor_id: aId });
  const conexionId = match.body?.conexionId;
  check('Match -> conexionId', !!conexionId);

  // 2) Un tercero no ve los mensajes
  const ajeno = await api('GET', `/conexiones/${conexionId}/mensajes`, tOrg);
  check('Un ajeno NO ve los mensajes -> 404', ajeno.status === 404);

  // 3) Socket de B en la sala de la conexion
  const socket = io(API, { auth: { token: tB }, transports: ['websocket'] });
  await new Promise((res) => { socket.on('connect', () => res()); setTimeout(res, 4000); });
  const ack = await new Promise((res) => { socket.emit('join_conexion', conexionId, (a) => res(a)); setTimeout(() => res(null), 4000); });
  check('B se une a la sala de la conexion (ack ok)', ack?.ok === true);

  // 4) A envia -> B recibe aviso
  const pMsg = esperarEvento(socket, 'mensajes:cambio');
  const env = await api('POST', `/conexiones/${conexionId}/mensajes`, tA, { texto: 'Hola!' });
  check('A envia mensaje -> 201', env.status === 201 && env.body?.autor?.id === aId);
  check('B recibe aviso mensajes:cambio', await pMsg);

  // 5) B lista
  const lista = await api('GET', `/conexiones/${conexionId}/mensajes`, tB);
  check('Lista: usados=1, limite=20',
    lista.status === 200 && lista.body?.usados === 1 && lista.body?.limite_mensajes === 20 &&
    lista.body?.mensajes?.length === 1);

  // 6) Llenar hasta el limite (ya hay 1; enviar 19 mas = 20) y el 21 -> 400
  for (let i = 0; i < 19; i++) {
    await api('POST', `/conexiones/${conexionId}/mensajes`, i % 2 ? tA : tB, { texto: `msg ${i}` });
  }
  const pasado = await api('POST', `/conexiones/${conexionId}/mensajes`, tA, { texto: 'uno de mas' });
  check('Pasado el limite (20) -> 400', pasado.status === 400);

  // 7) Limpieza
  socket.disconnect();
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tOrg);
  check('Borrar congreso -> 200', borrar.status === 200);

  console.log(fallos === 0
    ? '\n✅ E2E FASE 6 (chat) OK — mensajes en vivo, aislamiento y limite'
    : `\n❌ ${fallos} verificacion(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
