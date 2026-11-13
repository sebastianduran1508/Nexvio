// ==========================================================================
// ESCENARIO A — "La llegada" (decisión 48)
// 900 asistentes van abriendo la app durante 3 minutos y la usan 4 minutos:
// congreso, agenda, avisos, Mi agenda y alguna charla, con pausas de lectura.
//
// Uso (desde apps/backend/prisma/carga):
//   k6 run --out web-dashboard=export=reportes/a_llegada.html k6/a_llegada.js
// ==========================================================================
import { sleep } from 'k6';
import { DATOS, CRITERIOS, tokenDelVU, abrirApp, abrirCharla } from './_comun.js';

const N = Number(__ENV.N || 900);

export const options = {
  scenarios: {
    llegada: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: N }, // van llegando
        { duration: '4m', target: N }, // todos usando la app
        { duration: '1m', target: 0 }, // se van
      ],
    },
  },
  thresholds: CRITERIOS,
};

export default function () {
  const token = tokenDelVU();
  abrirApp(token);
  sleep(5 + Math.random() * 10); // lee el congreso
  const sesion = DATOS.sesiones[Math.floor(Math.random() * DATOS.sesiones.length)];
  abrirCharla(token, sesion);
  sleep(10 + Math.random() * 20); // lee la charla
}
