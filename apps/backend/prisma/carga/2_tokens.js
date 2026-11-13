// ==========================================================================
// FASE 9 · 9.1 — PASO 2: iniciar sesión con los N asistentes (antes de la carga)
//
// v2 (13-nov-2026), tras el primer intento (848/900 en 26 min por el 429):
//  - De a 3 a la vez y, si Supabase responde 429, TODOS esperan 30 s.
//  - REANUDABLE: guarda los tokens; si lo corres de nuevo, solo pide los que
//    faltan o están por vencer.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/carga/2_tokens.js <orgEmail> <orgPass>
// ==========================================================================
const fs = require('fs');
const path = require('path');
const { SUPA, ANON, DATOS, api, esperar, leer, guardar } = require('./_comun');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/carga/2_tokens.js <orgEmail> <orgPass>');
  process.exit(1);
}

const A_LA_VEZ = 3;
const MARGEN_SEG = 20 * 60; // un token que vence en menos de 20 min se vuelve a pedir

function vence(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8')).exp;
  } catch {
    return 0;
  }
}
const ahora = () => Math.floor(Date.now() / 1000);

let pausaHasta = 0; // si Supabase dice 429, todos esperan hasta esta hora

async function iniciarSesion(email, password) {
  for (let intento = 0; intento < 10; intento++) {
    const espera = pausaHasta - Date.now();
    if (espera > 0) await esperar(espera);
    const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (r.status === 429) {
      const nueva = Date.now() + 30000;
      if (nueva > pausaHasta) {
        pausaHasta = nueva;
        console.log('  ...  | Supabase pidió calma (429): pausa de 30 s');
      }
      continue;
    }
    const j = await r.json().catch(() => ({}));
    return j.access_token ?? null;
  }
  return null;
}

(async () => {
  const carga = leer('carga.json');
  const ruta = path.join(DATOS, 'tokens.json');
  const previo = fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : null;
  const porUsuario = previo?.congresoId === carga.congresoId && previo.porUsuario ? previo.porUsuario : {};

  const vigente = (t) => t && vence(t) - ahora() > MARGEN_SEG;
  const pendientes = carga.usuarios.filter((u) => !vigente(porUsuario[u.username]));
  console.log(`\n=== 9.1 · Tokens: ${carga.usuarios.length - pendientes.length} vigentes, ${pendientes.length} por pedir ===\n`);

  const orgToken = await iniciarSesion(orgEmail, orgPass);
  if (!orgToken) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }

  const escribir = () => {
    const tokens = carga.usuarios.map((u) => porUsuario[u.username]).filter(vigente);
    guardar('tokens.json', {
      creado: new Date().toISOString(),
      api: carga.api,
      congresoId: carga.congresoId,
      sesiones: carga.sesiones,
      estrellaId: carga.estrellaId,
      encuestaId: carga.encuestaId,
      orgToken,
      tokens,
      porUsuario,
    });
    return tokens;
  };

  const inicio = Date.now();
  let version = null;
  let hechos = 0;
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < pendientes.length) {
      const u = pendientes[siguiente++];
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: u.username })).body?.email;
      const token = email ? await iniciarSesion(email, u.password) : null;
      if (!token) {
        console.error(`  FALLA | ${u.username}`);
        continue;
      }
      if (!version) version = (await api('GET', '/auth/politica-datos', token)).body?.version;
      await api('POST', '/auth/aceptar-datos', token, { version });
      porUsuario[u.username] = token;
      if (++hechos % 50 === 0) {
        escribir();
        console.log(`  ok   | ${hechos}/${pendientes.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: A_LA_VEZ }, trabajador));

  const tokens = escribir();
  const minutos = tokens.length ? Math.floor((Math.min(...tokens.map(vence)) - ahora()) / 60) : 0;
  console.log(`\nListo: ${tokens.length}/${carga.usuarios.length} tokens vigentes (esta corrida tardó ${((Date.now() - inicio) / 1000).toFixed(0)} s).`);
  console.log(`El que vence primero dura ~${minutos} min más. Corre los escenarios antes de eso.`);
  if (tokens.length < carga.usuarios.length) console.log('Faltan algunos: vuelve a correr este paso y solo pedirá esos.');
  console.log('');
  process.exit(tokens.length === carga.usuarios.length ? 0 : 1);
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });