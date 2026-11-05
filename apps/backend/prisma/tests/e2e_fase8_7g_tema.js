// ==========================================================================
// FASE 8 · Bloque 8.7.g — Tema por defecto del congreso (backend)
//   1. El organizador elige "oscuro" y el detalle (lo que lee la app) lo trae.
//   2. Un valor que no es sistema/claro/oscuro -> 400.
//   3. Cambiar el tema no borra los colores ya elegidos.
// Uso: node prisma/tests/e2e_fase8_7g_tema.js <orgEmail> <orgPass>
// ==========================================================================
require('dotenv/config');
const { randomUUID } = require('crypto');
const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) { console.error('Uso: node prisma/tests/e2e_fase8_7g_tema.js <orgEmail> <orgPass>'); process.exit(1); }
const SUPA = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const resultados = [];
const check = (n, ok, d) => { resultados.push({ n, ok }); console.log(`${ok ? '  ok  ' : ' FALLA'} | ${n}${d ? '  -> ' + d : ''}`); };
async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}
(async () => {
  console.log('\n=== Bloque 8.7.g — tema por defecto ===\n');
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: orgEmail, password: orgPass }) });
  const t = (await r.json()).access_token;
  if (!t) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  let id = null;
  try {
    id = (await api('POST', '/congresos', t, { nombre: `8.7g ${randomUUID().slice(0, 6)}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' })).body?.id;
    await api('PUT', `/congresos/${id}/personalizacion`, t, { color_primario: '#0E7490' });
    const pon = await api('PUT', `/congresos/${id}/personalizacion`, t, { tema_default: 'oscuro' });
    check('el organizador elige el tema "oscuro"', pon.status === 200 && pon.body?.tema_default === 'oscuro', `HTTP ${pon.status}`);
    const det = (await api('GET', `/congresos/${id}`, t)).body;
    check('el detalle (lo que lee la app) trae tema_default = oscuro', det?.personalizacion?.tema_default === 'oscuro');
    check('cambiar el tema NO borró el color ya elegido', det?.personalizacion?.color_primario === '#0E7490');
    const malo = await api('PUT', `/congresos/${id}/personalizacion`, t, { tema_default: 'rosado' });
    check('un tema que no es sistema/claro/oscuro -> 400', malo.status === 400);
  } finally {
    if (id) await api('DELETE', `/congresos/${id}`, t);
    check('limpieza', true);
  }
  const f = resultados.filter((x) => !x.ok);
  console.log(f.length === 0 ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.7.g listo.` : `\nFALLARON ${f.length}: ` + f.map((x) => x.n).join(' | '));
  process.exit(f.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
