// ==========================================================================
// FASE 9 · 9.1 — Pruebas de carga: utilidades comunes de los scripts de Node
// (preparar, tokens, limpiar). Los escenarios de carga en sí son de k6.
// ==========================================================================
require('dotenv/config');
const fs = require('fs');
const path = require('path');

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Por defecto el backend local. Para la medición oficial (9.1b) se apunta al
// desplegado:  set API_URL=https://...   antes de correr los scripts.
const API = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const DATOS = path.join(__dirname, 'datos'); // ⚠️ en .gitignore: trae claves de cuentas de PRUEBA

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email, password) {
  for (let intento = 0; intento < 6; intento++) {
    const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (r.status === 429) {
      // Límite de inicios de sesión de Supabase: esperamos y reintentamos.
      await esperar(5000 * (intento + 1));
      continue;
    }
    const j = await r.json();
    return { status: r.status, token: j.access_token ?? null, expira: j.expires_at ?? null, error: j.msg ?? j.error_description };
  }
  return { status: 429, token: null, error: 'Límite de inicios de sesión de Supabase (429). Súbelo temporalmente: ver GUIA § 31.' };
}

async function api(method, ruta, token, body) {
  const r = await fetch(`${API}${ruta}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

/** Corre `tarea` sobre cada elemento con como mucho `n` a la vez. */
async function enParalelo(items, n, tarea) {
  const resultados = new Array(items.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < items.length) {
      const i = siguiente++;
      resultados[i] = await tarea(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, trabajador));
  return resultados;
}

function guardar(nombre, datos) {
  fs.mkdirSync(DATOS, { recursive: true });
  fs.writeFileSync(path.join(DATOS, nombre), JSON.stringify(datos, null, 2));
}
function leer(nombre) {
  const ruta = path.join(DATOS, nombre);
  if (!fs.existsSync(ruta)) {
    console.error(`No existe ${ruta}. ¿Corriste antes el paso anterior?`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(ruta, 'utf8'));
}

module.exports = { SUPA, ANON, SERVICE, API, DATOS, esperar, login, api, enParalelo, guardar, leer };
