// ==========================================================================
// FASE 9 · 9.1 — Común a los escenarios de k6.
// Lee los tokens que generó 2_tokens.js y define los criterios de aprobado
// (decisión 48): 95 % de respuestas en < 1 s y < 1 % de errores.
// ==========================================================================
import http from 'k6/http';
import { check } from 'k6';

export const DATOS = JSON.parse(open('../datos/tokens.json'));
export const API = __ENV.API_URL || DATOS.api || 'http://localhost:3000';
export const WS = API.replace(/^http/, 'ws');

/** Cada usuario virtual (VU) usa el token de un asistente distinto. */
export function tokenDelVU() {
  return DATOS.tokens[(__VU - 1) % DATOS.tokens.length];
}

export const CRITERIOS = {
  http_req_duration: ['p(95)<1000'], // 95 % en menos de 1 segundo
  http_req_failed: ['rate<0.01'], // menos del 1 % de errores
};

export function get(ruta, token, nombre) {
  const r = http.get(`${API}${ruta}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Idioma': 'es' },
    tags: { name: nombre || ruta },
  });
  check(r, { [`${nombre || ruta} → 200`]: (x) => x.status === 200 });
  return r;
}

export function post(ruta, token, cuerpo, nombre) {
  const r = http.post(`${API}${ruta}`, JSON.stringify(cuerpo), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idioma': 'es' },
    tags: { name: nombre || ruta },
  });
  check(r, { [`${nombre || ruta} → 2xx`]: (x) => x.status >= 200 && x.status < 300 });
  return r;
}

/**
 * Lo que hace la app al ABRIRSE (pestaña Congreso): las mismas llamadas, en el
 * mismo orden. Los nombres agrupan las métricas por pantalla en el reporte.
 */
export function abrirApp(token) {
  const c = DATOS.congresoId;
  get('/auth/yo', token, 'GET /auth/yo');
  get('/congresos', token, 'GET /congresos');
  get(`/congresos/${c}`, token, 'GET /congresos/:id');
  get(`/congresos/${c}/avisos`, token, 'GET /congresos/:id/avisos');
  get(`/congresos/${c}/mi-agenda`, token, 'GET /congresos/:id/mi-agenda');
}

/** Lo que hace la app al abrir una CHARLA. */
export function abrirCharla(token, sesionId) {
  get(`/sesiones/${sesionId}/preguntas`, token, 'GET /sesiones/:id/preguntas');
  get(`/sesiones/${sesionId}/encuestas`, token, 'GET /sesiones/:id/encuestas');
}
