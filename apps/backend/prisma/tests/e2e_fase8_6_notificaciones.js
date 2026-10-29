// ==========================================================================
// FASE 8 · Bloque 8.6 — Prueba END-TO-END de avisos (notificaciones) (8.6.a)
//
// Necesita un ORGANIZADOR y un ASISTENTE de la MISMA organización:
//   1. Dispositivos: el asistente registra su teléfono (token de Expo FALSO:
//      sirve para probar el flujo; Expo lo rechazará como era de esperar).
//   2. Envío inmediato: queda en el historial con su resultado y aparece en la
//      bandeja "Avisos" del asistente.
//   3. Validaciones: aviso de sesión sin sesión o de otro congreso, hora pasada,
//      a más de un año, formato raro. El asistente no puede enviar (403).
//   4. Programado: queda "programada", no sale en la bandeja, se cancela; y uno
//      de verdad, a ~70 s, que EL PROGRAMADOR envía solo (la prueba espera).
//   5. Borrar una sesión que tiene preguntas y avisos (fix del 8.6).
//   6. Al cerrar sesión, el teléfono se desactiva.
//
// Uso (desde apps/backend, con el backend corriendo; tarda ~2 minutos):
//   node prisma/tests/e2e_fase8_6_notificaciones.js <orgEmail> <orgPass> <asisEmail> <asisPass>
// ==========================================================================

require('dotenv/config');

const [, , orgEmail, orgPass, asisEmail, asisPass] = process.argv;
if (!orgEmail || !orgPass || !asisEmail || !asisPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_6_notificaciones.js <orgEmail> <orgPass> <asisEmail> <asisPass>');
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
  return (await r.json()).access_token ?? null;
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

/** Hora de Bogotá (UTC-5, sin horario de verano) dentro de `ms`, como la escribe el panel. */
const horaBogota = (ms) => new Date(Date.now() + ms - 5 * 3600 * 1000).toISOString().slice(0, 19);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const org = await login(orgEmail, orgPass);
  const asis = await login(asisEmail, asisPass);
  if (!org || !asis) throw new Error('No se pudo iniciar sesión (revisa las credenciales)');
  const TOKEN = `ExponentPushToken[e2e-falso-${Date.now()}]`;
  let cid = null;

  try {
    // ---------- Preparación: congreso de HOY a dentro de 2 días, en Bogotá ----------
    const hoy = horaBogota(0).slice(0, 10);
    const pasado = horaBogota(2 * 86400 * 1000).slice(0, 10);
    const c = await api('POST', '/congresos', org, { nombre: `E2E Avisos ${Date.now()}`, fecha_inicio: hoy, fecha_fin: pasado });
    cid = c.body.id;
    const otro = await api('POST', '/congresos', org, { nombre: `E2E Avisos otro ${Date.now()}`, fecha_inicio: hoy, fecha_fin: pasado });
    const s1 = await api('POST', `/congresos/${cid}/sesiones`, org, { titulo: 'Charla con avisos', inicio: `${pasado}T10:00`, fin: `${pasado}T11:00` });
    const sOtra = await api('POST', `/congresos/${otro.body.id}/sesiones`, org, { titulo: 'Ajena', inicio: `${pasado}T10:00`, fin: `${pasado}T11:00` });
    const ins = await api('POST', `/congresos/${cid}/inscripciones`, asis);
    check('El asistente se inscribe al congreso', ins.status === 201, JSON.stringify(ins.body));

    // ---------- 1. Dispositivos ----------
    const d1 = await api('POST', '/dispositivos', asis, { expo_push_token: TOKEN, plataforma: 'android' });
    check('Registrar el teléfono -> 201', d1.status === 201 && d1.body?.activo === true, JSON.stringify(d1.body));
    const d2 = await api('POST', '/dispositivos', asis, { expo_push_token: TOKEN });
    check('Registrarlo otra vez no lo duplica (mismo id)', d2.body?.id === d1.body?.id, JSON.stringify(d2.body));
    const dMal = await api('POST', '/dispositivos', asis, { expo_push_token: 'cualquier-cosa' });
    check('Token con formato que no es de Expo -> 400', dMal.status === 400, JSON.stringify(dMal.body));

    // ---------- 2. Envío inmediato ----------
    const n1 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'Bienvenidos', cuerpo: 'El registro abre a las 7:30.' });
    check('Aviso inmediato -> 201 y ya despachado', n1.status === 201 && ['enviada', 'fallida'].includes(n1.body?.estado) && !!n1.body?.enviado_en, JSON.stringify(n1.body));
    console.log(`        (Expo: ${n1.body?.enviados} enviados, ${n1.body?.fallidos} fallidos — con un token falso lo normal es que falle)`);
    const av1 = await api('GET', `/congresos/${cid}/avisos`, asis);
    check('El asistente lo ve en su bandeja "Avisos"', av1.status === 200 && av1.body?.some((a) => a.id === n1.body?.id), JSON.stringify(av1.body));
    const hist = await api('GET', `/congresos/${cid}/notificaciones`, org);
    check('Aparece en el historial del panel', hist.body?.some((n) => n.id === n1.body?.id), JSON.stringify(hist.body));

    // ---------- 3. Validaciones ----------
    const v1 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'X', cuerpo: 'Y', destino: 'sesion' });
    check('Aviso de sesión sin elegir la sesión -> 400', v1.status === 400, JSON.stringify(v1.body));
    const v2 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'X', cuerpo: 'Y', destino: 'sesion', sesion_id: sOtra.body.id });
    check('Aviso con una sesión de OTRO congreso -> 400', v2.status === 400, JSON.stringify(v2.body));
    const v3 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'X', cuerpo: 'Y', programada_para: horaBogota(-3600 * 1000) });
    check('Programar en el pasado -> 400', v3.status === 400, JSON.stringify(v3.body));
    const v4 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'X', cuerpo: 'Y', programada_para: horaBogota(400 * 86400 * 1000) });
    check('Programar a más de un año -> 400', v4.status === 400, JSON.stringify(v4.body));
    const v5 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'X', cuerpo: 'Y', programada_para: 'mañana a las 8' });
    check('Hora con formato raro -> 400', v5.status === 400, JSON.stringify(v5.body));
    const v6 = await api('POST', `/congresos/${cid}/notificaciones`, asis, { titulo: 'X', cuerpo: 'Y' });
    check('Un asistente NO puede enviar avisos -> 403', v6.status === 403, JSON.stringify(v6.body));

    // ---------- 4. Programados ----------
    const p1 = await api('POST', `/congresos/${cid}/notificaciones`, org, { titulo: 'Para cancelar', cuerpo: 'No debe salir', programada_para: horaBogota(3600 * 1000) });
    check('Programar a 1 hora -> estado "programada"', p1.status === 201 && p1.body?.estado === 'programada', JSON.stringify(p1.body));
    const av2 = await api('GET', `/congresos/${cid}/avisos`, asis);
    check('Un programado NO sale todavía en la bandeja', !av2.body?.some((a) => a.id === p1.body?.id), JSON.stringify(av2.body));
    const can = await api('DELETE', `/notificaciones/${p1.body.id}`, org);
    check('Cancelar el programado -> 200', can.status === 200, JSON.stringify(can.body));
    const can2 = await api('DELETE', `/notificaciones/${n1.body.id}`, org);
    check('Cancelar uno YA enviado -> 409', can2.status === 409, JSON.stringify(can2.body));

    const p2 = await api('POST', `/congresos/${cid}/notificaciones`, org, {
      titulo: 'Recordatorio', cuerpo: 'La charla empieza pronto', destino: 'sesion', sesion_id: s1.body.id,
      programada_para: horaBogota(70 * 1000),
    });
    check('Programar a ~70 segundos -> "programada"', p2.body?.estado === 'programada', JSON.stringify(p2.body));
    process.stdout.write('        esperando al programador (revisa cada minuto)');
    let enviado = null;
    for (let i = 0; i < 30 && !enviado; i++) {
      await dormir(5000);
      process.stdout.write('.');
      const h = await api('GET', `/congresos/${cid}/notificaciones`, org);
      const n = h.body?.find((x) => x.id === p2.body.id);
      if (n && n.estado !== 'programada' && n.estado !== 'enviando') enviado = n;
    }
    console.log('');
    check('EL PROGRAMADOR lo envió solo a su hora', !!enviado && !!enviado.enviado_en, JSON.stringify(enviado));
    check('...y lleva el enlace a su sesión', enviado?.sesion?.id === s1.body.id, JSON.stringify(enviado?.sesion));

    // ---------- 5. Borrar una sesión con preguntas y avisos ----------
    const pq = await api('POST', `/sesiones/${s1.body.id}/preguntas`, asis, { texto: '¿Habrá diapositivas?' });
    check('El asistente hace una pregunta en la charla', pq.status === 201, JSON.stringify(pq.body));
    const bs = await api('DELETE', `/sesiones/${s1.body.id}`, org);
    check('Borrar una sesión con preguntas y avisos -> 200', bs.status === 200, JSON.stringify(bs.body));
    const h2 = await api('GET', `/congresos/${cid}/notificaciones`, org);
    const queda = h2.body?.find((x) => x.id === p2.body.id);
    check('El aviso sigue en el historial, sin enlace a la sesión', !!queda && queda.sesion === null, JSON.stringify(queda));

    // ---------- 6. Cerrar sesión ----------
    const des = await api('POST', '/dispositivos/desactivar', asis, { expo_push_token: TOKEN });
    check('Al cerrar sesión el teléfono se desactiva', des.status === 201 && des.body?.desactivados === 1, JSON.stringify(des.body));

    await api('DELETE', `/congresos/${otro.body.id}`, org);
  } finally {
    if (cid) await api('DELETE', `/congresos/${cid}`, org);
  }

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones OK`);
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
