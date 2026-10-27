// ==========================================================================
// FASE 8 · Bloque 8.4 — Prueba END-TO-END de las reglas de la agenda
//
// Usa un congreso en CIUDAD DE MÉXICO (UTC-6) a propósito: así se nota si la
// hora se interpreta en la zona del evento y no en la del PC (Bogotá, UTC-5).
//
//   1. Zona horaria: "09:00" sin zona = hora del evento -> 15:00Z.
//      Una hora con zona ("-05:00") se respeta tal cual.
//   2. Reglas: fin después de inicio, dentro de las fechas del congreso
//      (contadas en la zona del evento), formatos y fechas imposibles.
//      Correr la agenda: mueve las siguientes del mismo día, todo o nada.
//   3. Breaks sin ponentes; un ponente solo en SU congreso.
//   4. Ficha del ponente (pais_codigo en mayúsculas) y ponentes por sesión.
//   5. Zona horaria inválida en el congreso -> 400.
//   6. Limpieza: borra los congresos de prueba.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_4_agenda.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_4_agenda.js <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${!ok && detalle ? '  -> ' + detalle : ''}`);
}

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  return j.access_token ?? null;
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
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

const iso = (s) => (s ? new Date(s).toISOString() : null);

(async () => {
  const token = await login(orgEmail, orgPass);
  if (!token) throw new Error('No se pudo iniciar sesión como organizador');
  const creados = [];

  try {
    // ---------- Preparación ----------
    const c = await api('POST', '/congresos', token, {
      nombre: `E2E Agenda México ${Date.now()}`,
      fecha_inicio: '2026-11-12',
      fecha_fin: '2026-11-13',
      zona_horaria: 'America/Mexico_City',
    });
    check('Crear congreso en America/Mexico_City -> 201', c.status === 201, JSON.stringify(c.body));
    const cid = c.body.id;
    creados.push(cid);

    const otro = await api('POST', '/congresos', token, {
      nombre: `E2E Agenda Otro ${Date.now()}`,
      fecha_inicio: '2026-11-12',
      fecha_fin: '2026-11-13',
    });
    creados.push(otro.body.id);

    // ---------- 1. Zona horaria ----------
    const s1 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Apertura', inicio: '2026-11-12T09:00', fin: '2026-11-12T10:00',
    });
    check('Sesión "09:00" sin zona -> 201', s1.status === 201, JSON.stringify(s1.body));
    check('"09:00" en México se guarda como 15:00Z', iso(s1.body?.inicio) === '2026-11-12T15:00:00.000Z', iso(s1.body?.inicio));

    const s2 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Con zona', inicio: '2026-11-12T10:00:00-05:00', fin: '2026-11-12T11:00:00-05:00',
    });
    check('Hora con zona (-05:00) se respeta tal cual -> 15:00Z', iso(s2.body?.inicio) === '2026-11-12T15:00:00.000Z', iso(s2.body?.inicio));

    // ---------- 2. Reglas de horario ----------
    const r1 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Al revés', inicio: '2026-11-12T11:00', fin: '2026-11-12T10:00',
    });
    check('Fin antes del inicio -> 400', r1.status === 400, JSON.stringify(r1.body));

    const r2 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Fuera', inicio: '2026-11-14T09:00', fin: '2026-11-14T10:00',
    });
    check('Fuera de las fechas del congreso -> 400', r2.status === 400, JSON.stringify(r2.body));

    const r3 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Cena de cierre', inicio: '2026-11-13T21:00', fin: '2026-11-13T22:30',
    });
    check('21:00 del último día (ya es el día siguiente en UTC) -> 201', r3.status === 201, JSON.stringify(r3.body));

    const r4 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Formato raro', inicio: '12/11/2026 9am', fin: '12/11/2026 10am',
    });
    check('Formato inválido -> 400', r4.status === 400, JSON.stringify(r4.body));

    const r5 = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Imposible', inicio: '2026-02-31T09:00', fin: '2026-02-31T10:00',
    });
    check('Fecha imposible (31 de febrero) -> 400', r5.status === 400, JSON.stringify(r5.body));

    const r6 = await api('PATCH', `/sesiones/${s1.body.id}`, token, { fin: '2026-11-12T08:00' });
    check('PATCH solo del fin, anterior al inicio guardado -> 400', r6.status === 400, JSON.stringify(r6.body));

    const r7 = await api('PATCH', `/sesiones/${s1.body.id}`, token, { fin: '2026-11-12T10:30' });
    check('PATCH válido -> 200 y fin = 16:30Z', r7.status === 200 && iso(r7.body?.fin) === '2026-11-12T16:30:00.000Z', iso(r7.body?.fin));

    // ---------- 2b. Correr la agenda ----------
    // Día 13 (México): X 14:00-15:00, Y 15:00-16:00, Z 16:30-17:00 (+ la cena de 21:00).
    const X = await api('POST', `/congresos/${cid}/sesiones`, token, { titulo: 'X', inicio: '2026-11-13T14:00', fin: '2026-11-13T15:00' });
    const Y = await api('POST', `/congresos/${cid}/sesiones`, token, { titulo: 'Y', inicio: '2026-11-13T15:00', fin: '2026-11-13T16:00' });
    const Z = await api('POST', `/congresos/${cid}/sesiones`, token, { titulo: 'Z', inicio: '2026-11-13T16:30', fin: '2026-11-13T17:00' });
    const ver = async (id) => (await api('GET', `/congresos/${cid}/sesiones`, token)).body.find((s) => s.id === id);

    const c1 = await api('PATCH', `/sesiones/${X.body.id}`, token, { fin: '2026-11-13T15:30', correr_siguientes: true });
    check('Alargar X 30 min corriendo las siguientes -> 200', c1.status === 200, JSON.stringify(c1.body));
    check('Y pasa a 15:30 (21:30Z)', iso((await ver(Y.body.id))?.inicio) === '2026-11-13T21:30:00.000Z', iso((await ver(Y.body.id))?.inicio));
    check('Z pasa a 17:00 (23:00Z)', iso((await ver(Z.body.id))?.inicio) === '2026-11-13T23:00:00.000Z', iso((await ver(Z.body.id))?.inicio));
    check('Una sesión de OTRO día no se mueve', iso((await ver(s1.body.id))?.inicio) === '2026-11-12T15:00:00.000Z', iso((await ver(s1.body.id))?.inicio));

    const c2 = await api('PATCH', `/sesiones/${X.body.id}`, token, { fin: '2026-11-13T19:00', correr_siguientes: true });
    check('Correr que sacaría la cena del congreso -> 400', c2.status === 400, JSON.stringify(c2.body));
    check('...y no movió nada (todo o nada)', iso((await ver(Y.body.id))?.inicio) === '2026-11-13T21:30:00.000Z', iso((await ver(Y.body.id))?.inicio));

    const c3 = await api('PATCH', `/sesiones/${X.body.id}`, token, { fin: '2026-11-13T16:00' });
    check('Alargar SIN correr no mueve a las demás', c3.status === 200 && iso((await ver(Y.body.id))?.inicio) === '2026-11-13T21:30:00.000Z', iso((await ver(Y.body.id))?.inicio));

    // ---------- 3. Breaks y ponentes ----------
    const p1 = await api('POST', `/congresos/${cid}/ponentes`, token, {
      nombre: 'Dra. Prueba', cargo: 'Investigadora', empresa: 'Instituto E2E', pais: 'Colombia', pais_codigo: 'co',
    });
    check('Crear ponente con ficha -> 201', p1.status === 201, JSON.stringify(p1.body));
    check('pais_codigo "co" se guarda como "CO"', p1.body?.pais_codigo === 'CO', p1.body?.pais_codigo);

    const brk = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Café', tipo: 'break', inicio: '2026-11-12T10:30', fin: '2026-11-12T11:00',
    });
    check('Crear break -> 201 con tipo "break"', brk.status === 201 && brk.body?.tipo === 'break', JSON.stringify(brk.body));

    const a1 = await api('POST', `/sesiones/${brk.body.id}/ponentes/${p1.body.id}`, token);
    check('Asignar ponente a un break -> 400', a1.status === 400, JSON.stringify(a1.body));

    const a2 = await api('POST', `/sesiones/${s1.body.id}/ponentes/${p1.body.id}`, token);
    check('Asignar ponente a una charla -> 201', a2.status === 201, JSON.stringify(a2.body));

    const a3 = await api('PATCH', `/sesiones/${s1.body.id}`, token, { tipo: 'break' });
    check('Convertir en break una charla con ponentes -> 409', a3.status === 409, JSON.stringify(a3.body));

    const pOtro = await api('POST', `/congresos/${otro.body.id}/ponentes`, token, { nombre: 'Ponente de otro congreso' });
    const a4 = await api('POST', `/sesiones/${s1.body.id}/ponentes/${pOtro.body.id}`, token);
    check('Asignar ponente de OTRO congreso -> 400', a4.status === 400, JSON.stringify(a4.body));

    const tipoMalo = await api('POST', `/congresos/${cid}/sesiones`, token, {
      titulo: 'Tipo raro', tipo: 'fiesta', inicio: '2026-11-12T12:00', fin: '2026-11-12T13:00',
    });
    check('Tipo de sesión desconocido -> 400', tipoMalo.status === 400, JSON.stringify(tipoMalo.body));

    // ---------- 4. Detalle ----------
    const det = await api('GET', `/congresos/${cid}`, token);
    const apertura = det.body?.sesiones?.find((s) => s.id === s1.body.id);
    check('El detalle trae los ponentes de cada sesión', apertura?.ponentes?.[0]?.ponente?.nombre === 'Dra. Prueba', JSON.stringify(apertura?.ponentes));

    // ---------- 5. Zona horaria del congreso ----------
    const zMala = await api('POST', '/congresos', token, {
      nombre: 'Zona mala', fecha_inicio: '2026-11-12', fecha_fin: '2026-11-13', zona_horaria: 'Marte/Base_Alfa',
    });
    check('Congreso con zona horaria inventada -> 400', zMala.status === 400, JSON.stringify(zMala.body));
    if (zMala.status === 201) creados.push(zMala.body.id);
  } finally {
    // ---------- 6. Limpieza ----------
    for (const id of creados) {
      if (id) await api('DELETE', `/congresos/${id}`, token);
    }
  }

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones OK`);
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
