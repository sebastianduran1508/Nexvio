// ==========================================================================
// FASE 5 — Prueba END-TO-END del tiempo real (Socket.io).
//
// Verifica el patron "avisar y refrescar":
//   1. El asistente abre un socket (con su JWT) y se une a la sala de la sesion.
//   2. Cuando ALGUIEN escribe por REST (una pregunta, una encuesta), el socket
//      del asistente recibe el aviso correspondiente.
//
// Pasos:
//   a) org crea congreso + sesion.
//   b) asistente conecta socket -> join_sesion (ack ok).
//   c) asistente formula una pregunta -> el socket recibe 'preguntas:cambio'.
//   d) org crea una encuesta          -> el socket recibe 'encuestas:cambio'.
//   e) limpieza.
//
// Requiere backend corriendo, socket.io-client instalado, y en .env:
//   SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_fase5_realtime.js <emailOrg> <passOrg> <emailAsistente> <passAsistente>
// ==========================================================================

require('dotenv/config');
const { io } = require('socket.io-client');

const [, , emailOrg, passOrg, emailAsis, passAsis] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

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

// Espera UNA vez el evento `ev` en el socket, con timeout.
function esperarEvento(socket, ev, ms = 4000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), ms);
    socket.once(ev, () => { clearTimeout(t); resolve(true); });
  });
}

(async () => {
  const tOrg = await login(emailOrg, passOrg);
  const tAsis = await login(emailAsis, passAsis);

  // a) congreso + sesion
  const congreso = await api('POST', '/congresos', tOrg, {
    nombre: 'Congreso E2E Realtime', fecha_inicio: '2026-11-12', fecha_fin: '2026-11-12',
  });
  const congresoId = congreso.body?.id;
  const sesion = await api('POST', `/congresos/${congresoId}/sesiones`, tOrg, {
    titulo: 'Sesion realtime', inicio: '2026-11-12T14:00:00Z', fin: '2026-11-12T15:00:00Z',
  });
  const sesionId = sesion.body?.id;
  check('Preparar congreso + sesion', congreso.status === 201 && sesion.status === 201);

  // b) socket del asistente
  const socket = io(API, { auth: { token: tAsis }, transports: ['websocket'] });
  const conectado = await new Promise((res) => {
    socket.on('connect', () => res(true));
    socket.on('connect_error', () => res(false));
    setTimeout(() => res(false), 4000);
  });
  check('Socket del asistente conecta', conectado);

  const joinAck = await new Promise((res) => {
    socket.emit('join_sesion', sesionId, (ack) => res(ack));
    setTimeout(() => res(null), 4000);
  });
  check('Unirse a la sala de la sesion (ack ok)', joinAck?.ok === true);

  // c) pregunta -> preguntas:cambio
  const pPreg = esperarEvento(socket, 'preguntas:cambio');
  await api('POST', `/sesiones/${sesionId}/preguntas`, tAsis, { texto: 'Pregunta en vivo' });
  check('Recibe aviso preguntas:cambio', await pPreg);

  // d) encuesta -> encuestas:cambio
  const pEnc = esperarEvento(socket, 'encuestas:cambio');
  await api('POST', `/sesiones/${sesionId}/encuestas`, tOrg, {
    pregunta: '¿Vas bien?', opciones: ['Si', 'No'],
  });
  check('Recibe aviso encuestas:cambio', await pEnc);

  // e) limpieza
  socket.disconnect();
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tOrg);
  check('Borrar congreso -> 200', borrar.status === 200);

  console.log(fallos === 0
    ? '\n✅ E2E FASE 5 (realtime) OK — el socket recibe los avisos en vivo'
    : `\n❌ ${fallos} verificacion(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
