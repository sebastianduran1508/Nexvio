// ==========================================================================
// ESCENARIO B — "La charla estrella" (decisión 48)
// 700 asistentes conectados EN VIVO (Socket.io) a la misma charla. Al empezar,
// el organizador abre la encuesta; cada asistente vota una vez en los
// primeros ~40 s y uno de cada diez envía una pregunta. Como la app real, cada
// teléfono VUELVE A PEDIR los datos cuando el servidor avisa de un cambio
// ("avisar y refrescar"): eso es justo lo que queremos medir.
//
// Uso (desde apps/backend/prisma/carga):
//   k6 run --out web-dashboard=export=reportes/b_charla_estrella.html k6/b_charla_estrella.js
// ==========================================================================
import http from 'k6/http';
import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { API, WS, DATOS, CRITERIOS, tokenDelVU, get, post, abrirCharla } from './_comun.js';

const N = Number(__ENV.N || 700);
const SEG_EN_SALA = Number(__ENV.SEG || 150);

const conectados = new Counter('salas_unidas');
const avisosRecibidos = new Counter('avisos_recibidos');
const tiempoUnirse = new Trend('tiempo_unirse_sala', true);

export const options = {
  scenarios: {
    charla: { executor: 'per-vu-iterations', vus: N, iterations: 1, maxDuration: `${SEG_EN_SALA + 120}s` },
  },
  thresholds: {
    ...CRITERIOS,
    salas_unidas: [`count>=${Math.floor(N * 0.99)}`], // 99 % logra entrar a la sala en vivo
  },
};

/** Antes de empezar: el organizador abre la encuesta y leemos sus opciones. */
export function setup() {
  const h = { headers: { Authorization: `Bearer ${DATOS.orgToken}`, 'Content-Type': 'application/json' } };
  http.patch(`${API}/encuestas/${DATOS.encuestaId}`, JSON.stringify({ activa: true }), h);
  const encs = http.get(`${API}/sesiones/${DATOS.estrellaId}/encuestas`, h).json();
  const enc = (encs || []).find((e) => e.id === DATOS.encuestaId);
  return { opciones: (enc?.opciones || []).map((o) => o.id) };
}

/** Al terminar: la encuesta se cierra. */
export function teardown() {
  http.patch(`${API}/encuestas/${DATOS.encuestaId}`, JSON.stringify({ activa: false }), {
    headers: { Authorization: `Bearer ${DATOS.orgToken}`, 'Content-Type': 'application/json' },
  });
}

export default function (datos) {
  const token = tokenDelVU();
  const sala = DATOS.estrellaId;
  const url = `${WS}/socket.io/?EIO=4&transport=websocket`;
  const inicio = Date.now();

  const res = ws.connect(url, {}, function (socket) {
    socket.on('message', (m) => {
      if (m === '2') return socket.send('3'); // ping de Engine.IO → pong
      if (m.startsWith('0')) return socket.send(`40${JSON.stringify({ token })}`); // conectar con el token
      if (m.startsWith('40')) return socket.send(`420${JSON.stringify(['join_sesion', sala])}`); // unirse a la charla
      if (m.startsWith('430')) {
        // respuesta a join_sesion
        const ok = m.includes('"ok":true');
        check(ok, { 'entró a la sala en vivo': (x) => x });
        if (ok) {
          conectados.add(1);
          tiempoUnirse.add(Date.now() - inicio);
          abrirCharla(token, sala); // la app carga preguntas y encuestas al entrar
        }
        return;
      }
      if (m.startsWith('42')) {
        // evento del servidor → la app vuelve a pedir lo que cambió
        avisosRecibidos.add(1);
        if (m.includes('encuestas:cambio')) get(`/sesiones/${sala}/encuestas`, token, 'refresco encuestas');
        else if (m.includes('preguntas:cambio')) get(`/sesiones/${sala}/preguntas`, token, 'refresco preguntas');
      }
    });

    // Vota una vez en algún momento de los primeros ~40 s.
    socket.setTimeout(() => {
      const op = datos.opciones[Math.floor(Math.random() * datos.opciones.length)];
      if (op) post(`/encuestas/${DATOS.encuestaId}/votar`, token, { opcion_id: op }, 'POST /encuestas/:id/votar');
    }, 5000 + Math.random() * 35000);

    // Uno de cada diez hace una pregunta.
    if (Math.random() < 0.1) {
      socket.setTimeout(() => {
        post(`/sesiones/${sala}/preguntas`, token, { texto: `Pregunta de prueba de carga ${__VU}` }, 'POST /sesiones/:id/preguntas');
      }, 10000 + Math.random() * 60000);
    }

    socket.setTimeout(() => socket.close(), SEG_EN_SALA * 1000);
  });
  check(res, { 'websocket abrió (101)': (r) => r && r.status === 101 });
}
