// ==========================================================================
// FASE 9 · 9.1 — PASO 1: preparar el congreso de carga (decisión 48)
//
// Crea en la organización del organizador:
//   - un congreso "Carga N" con 6 charlas (una es la "Charla estrella") y una
//     encuesta CERRADA en la estrella (el escenario B la abre);
//   - N asistentes ficticios, importados POR EXCEL en lotes de 150 (de paso,
//     mide cuánto tarda la importación grande).
// Guarda todo en datos/carga.json (ignorado por git).
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/carga/1_preparar.js <orgEmail> <orgPass> [N=900]
// ==========================================================================
const ExcelJS = require('exceljs');
const { randomUUID } = require('crypto');
const { API, login, api, guardar } = require('./_comun');

const [, , orgEmail, orgPass, nTxt] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/carga/1_preparar.js <orgEmail> <orgPass> [N=900]');
  process.exit(1);
}
const N = Number(nTxt || 900);
const LOTE = 150;

function hoy(desfaseDias = 0) {
  const d = new Date(Date.now() + desfaseDias * 86400000);
  return d.toISOString().slice(0, 10);
}

async function excelDe(filas) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Inscritos');
  hoja.addRow(['Nombres', 'Apellidos', 'Tipo documento', 'Número documento', 'Tipo suscripción', 'País']);
  for (const f of filas) hoja.addRow([f.nombres, f.apellidos, 'CC', f.documento, 'General', 'Colombia']);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

(async () => {
  console.log(`\n=== 9.1 · Preparar el congreso de carga (${N} asistentes) contra ${API} ===\n`);
  const org = await login(orgEmail, orgPass);
  if (!org.token) { console.error('No se pudo entrar con el organizador:', org.error); process.exit(1); }
  const t = org.token;
  const sufijo = randomUUID().slice(0, 5).toUpperCase();
  const dia = hoy(1);

  // ---------- Congreso, charlas y encuesta ----------
  const cong = await api('POST', '/congresos', t, { nombre: `Carga ${N} · ${sufijo}`, fecha_inicio: dia, fecha_fin: dia });
  if (cong.status !== 201) { console.error('No se pudo crear el congreso:', cong.body); process.exit(1); }
  const congresoId = cong.body.id;
  const charlas = ['Apertura', 'Charla estrella', 'Panel de expertos', 'Taller práctico', 'Casos clínicos', 'Cierre'];
  const sesiones = [];
  for (let i = 0; i < charlas.length; i++) {
    const h = String(8 + i).padStart(2, '0');
    const s = await api('POST', `/congresos/${congresoId}/sesiones`, t, { titulo: charlas[i], inicio: `${dia}T${h}:00`, fin: `${dia}T${h}:50` });
    if (s.status !== 201) { console.error('No se pudo crear la charla:', s.body); process.exit(1); }
    sesiones.push(s.body.id);
  }
  const estrellaId = sesiones[1];
  const enc = await api('POST', `/sesiones/${estrellaId}/encuestas`, t, {
    pregunta: '¿Qué tema quieres que profundicemos?',
    opciones: ['Técnicas nuevas', 'Casos reales', 'Complicaciones', 'Investigación'],
  });
  if (enc.status !== 201) { console.error('No se pudo crear la encuesta:', enc.body); process.exit(1); }
  console.log(`  ok  | congreso, 6 charlas y encuesta (cerrada) creados`);

  // ---------- N asistentes por Excel, en lotes ----------
  const filas = Array.from({ length: N }, (_, i) => ({
    nombres: `Asistente ${String(i + 1).padStart(3, '0')}`,
    apellidos: `Carga ${sufijo}`,
    documento: `CARGA${sufijo}${String(i + 1).padStart(4, '0')}`,
  }));
  const usuarios = [];
  const tiempos = [];
  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);
    const form = new FormData();
    form.append('archivo', new Blob([await excelDe(lote)]), `carga_${i}.xlsx`);
    const inicio = Date.now();
    const r = await fetch(`${API}/congresos/${congresoId}/importacion/confirmar`, {
      method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: form,
    });
    const seg = (Date.now() - inicio) / 1000;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error(`Falló la importación del lote ${i / LOTE + 1}:`, j); process.exit(1); }
    tiempos.push(seg);
    for (const c of j.credenciales ?? []) usuarios.push({ username: c.username, password: c.password_temporal });
    console.log(`  ok  | lote ${i / LOTE + 1}: ${j.creadas} asistentes importados en ${seg.toFixed(1)} s` + (j.fallidas?.length ? `  (${j.fallidas.length} fallidas)` : ''));
  }

  guardar('carga.json', { creado: new Date().toISOString(), api: API, sufijo, congresoId, sesiones, estrellaId, encuestaId: enc.body.id, usuarios });
  const total = tiempos.reduce((a, b) => a + b, 0);
  console.log(`\nListo: ${usuarios.length}/${N} asistentes en ${total.toFixed(1)} s (${(total / usuarios.length * 1000).toFixed(0)} ms por persona).`);
  console.log('Datos guardados en prisma/carga/datos/carga.json (no se sube a git).');
  console.log('Siguiente: node prisma/carga/2_tokens.js   (justo antes de correr los escenarios)\n');
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
