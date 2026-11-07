// ==========================================================================
// FASE 8 · Bloque 8.8.c — El backend responde en el idioma de la app
//
//   1. Un error con X-Idioma: en / pt llega traducido (y con el mismo código).
//   2. Sin cabecera, o con Accept-Language: en (lo que manda un navegador,
//      o sea el PANEL), sigue en español.
//   3. Un error de 401 (sin sesión) también se traduce.
//   4. Un mensaje que NO está en la lista sale tal cual (no se rompe nada) y
//      los errores de validación siguen llegando como lista.
//   5. La política de datos en es / en / pt: MISMA versión, mismas 8
//      secciones, textos distintos, y la cláusula "prevalece el español".
//
// No crea ni borra nada. Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_8_idiomas.js <orgEmail> <orgPass>
// ==========================================================================
require('dotenv/config');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_8_idiomas.js <orgEmail> <orgPass>');
  process.exit(1);
}
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${detalle ? '  -> ' + detalle : ''}`);
}
async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  return (await r.json()).access_token ?? null;
}
async function api(method, path, { token, body, headers } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

(async () => {
  console.log('\n=== Bloque 8.8.c — El backend en el idioma de la app ===\n');

  // ---------- 1 y 2: un error conocido (usuario que no existe) ----------
  const malo = { username: 'no-existe-8-8-xyz' };
  const es = await api('POST', '/auth/resolver-usuario', { body: malo });
  const en = await api('POST', '/auth/resolver-usuario', { body: malo, headers: { 'X-Idioma': 'en' } });
  const pt = await api('POST', '/auth/resolver-usuario', { body: malo, headers: { 'X-Idioma': 'pt' } });
  const nav = await api('POST', '/auth/resolver-usuario', { body: malo, headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
  check('sin cabecera: el error sale en español', es.body?.message === 'Usuario o contraseña incorrectos', es.body?.message);
  check('X-Idioma: en -> en inglés', en.body?.message === 'Wrong username or password', en.body?.message);
  check('X-Idioma: pt -> en portugués', pt.body?.message === 'Usuário ou senha incorretos', pt.body?.message);
  check('el código HTTP no cambia al traducir', es.status === en.status && en.status === pt.status, `${es.status}/${en.status}/${pt.status}`);
  check('Accept-Language: en (el panel) sigue en español', nav.body?.message === 'Usuario o contraseña incorrectos', nav.body?.message);

  // ---------- 3: 401 sin sesión ----------
  const s401 = await api('GET', '/auth/politica-datos', { headers: { 'X-Idioma': 'en' } });
  check('401 sin sesión también se traduce', s401.status === 401 && s401.body?.message === 'Please sign in', `${s401.status} ${s401.body?.message}`);

  // ---------- 4: mensajes fuera de la lista y validación ----------
  const vacio = await api('POST', '/auth/resolver-usuario', { body: { username: '' }, headers: { 'X-Idioma': 'en' } });
  check('validación: sigue siendo 400 y llega como lista', vacio.status === 400 && Array.isArray(vacio.body?.message), JSON.stringify(vacio.body?.message));
  const raro = await api('POST', '/auth/resolver-usuario', { body: malo, headers: { 'X-Idioma': 'fr' } });
  check('idioma que no existe (fr) -> español', raro.body?.message === 'Usuario o contraseña incorrectos', raro.body?.message);

  // ---------- 5: la política en los tres idiomas ----------
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const pol = {};
  for (const idioma of ['es', 'en', 'pt']) {
    pol[idioma] = (await api('GET', '/auth/politica-datos', { token: tOrg, headers: { 'X-Idioma': idioma } })).body;
  }
  const sinCab = (await api('GET', '/auth/politica-datos', { token: tOrg })).body;
  check('política: la misma versión en los 3 idiomas',
    !!pol.es?.version && pol.es.version === pol.en?.version && pol.en.version === pol.pt?.version, pol.es?.version);
  check('política: 8 secciones en los 3 idiomas',
    [pol.es, pol.en, pol.pt].every((p) => p?.secciones?.length === 8), [pol.es, pol.en, pol.pt].map((p) => p?.secciones?.length).join('/'));
  check('política: mismo número de párrafos por sección',
    pol.es?.secciones?.every((s, i) => s.parrafos.length === pol.en.secciones[i].parrafos.length && s.parrafos.length === pol.pt.secciones[i].parrafos.length));
  check('política: los títulos sí cambian de idioma',
    pol.es?.secciones?.[1]?.titulo === '2. Qué datos tratamos' && pol.en?.secciones?.[1]?.titulo === '2. What data we process' && pol.pt?.secciones?.[1]?.titulo === '2. Quais dados tratamos');
  check('política: fecha de vigencia en cada idioma',
    pol.es?.vigente_desde === '3 de noviembre de 2026' && pol.en?.vigente_desde === 'November 3, 2026' && pol.pt?.vigente_desde === '3 de novembro de 2026');
  check('política: la cláusula "prevalece el español" en los 3',
    /prevalece la versión en español/.test(JSON.stringify(pol.es)) && /Spanish version prevails/.test(JSON.stringify(pol.en)) && /prevalece a versão em espanhol/.test(JSON.stringify(pol.pt)));
  check('política: sin cabecera llega la de español (el panel)', JSON.stringify(sinCab) === JSON.stringify(pol.es));
  check('política: el responsable (dato de la organización) es el mismo', pol.es?.responsable === pol.en?.responsable && pol.en?.responsable === pol.pt?.responsable, pol.es?.responsable);

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} pruebas OK${fallas ? `  (${fallas} FALLA)` : ''}\n`);
  process.exit(fallas ? 1 : 0);
})();
