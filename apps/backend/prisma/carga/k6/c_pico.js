// ==========================================================================
// ESCENARIO C — "El pico por notificación" (decisión 48)
// El organizador manda un aviso y los 900 abren la app casi a la vez: todos
// llegan en una ventana de 30 segundos.
//
// Uso (desde apps/backend/prisma/carga):
//   k6 run --out web-dashboard=export=reportes/c_pico.html k6/c_pico.js
// ==========================================================================
import { sleep } from 'k6';
import { CRITERIOS, tokenDelVU, abrirApp, get } from './_comun.js';
import { DATOS } from './_comun.js';

const N = Number(__ENV.N || 900);

export const options = {
  scenarios: {
    pico: {
      executor: 'per-vu-iterations',
      vus: N,
      iterations: 1,
      maxDuration: '3m',
    },
  },
  thresholds: CRITERIOS,
};

export default function () {
  sleep(Math.random() * 30); // cada quien ve la notificación en algún momento de esos 30 s
  const token = tokenDelVU();
  // Tocar la notificación abre la app y la pantalla de Avisos.
  abrirApp(token);
  get(`/congresos/${DATOS.congresoId}/avisos`, token, 'GET /congresos/:id/avisos');
}
