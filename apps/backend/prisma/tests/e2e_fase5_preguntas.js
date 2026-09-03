// ==========================================================================
// FASE 5 — Prueba END-TO-END de las preguntas en vivo.
//
//   1. El organizador crea un congreso + sesion temporales.
//   2. El asistente formula una pregunta -> 201, estado 'pendiente'.
//   3. El asistente GET preguntas -> NO la ve (aun pendiente).
//   4. El staff GET preguntas -> SI la ve (ve todas, para moderar).
//   5. El asistente intenta moderar -> 403.
//   6. El staff la aprueba (PATCH) -> 200, estado 'aprobada'.
//   7. El asistente GET preguntas -> ahora SI la ve.
//   8. Limpieza: el organizador borra el congreso (arrastra la pregunta).
//
// Requiere backend corriendo y en .env: SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_fase5_preguntas.js <emailOrg> <passOrg> <emailAsistente> <passAsistente>
// ==========================================================================

require('dotenv/config');

const [, , emailOrg, passOrg, emailAsis, passAsis] = process.argv;
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

let fallos = 0;
const check = (d, c) => { console.log(`${c ? '✅' : '❌'} ${d}`); if (!c) fallos++; };

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login fallo: ' + JSON.stringify(j));
  return j.access_token;
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

(async () => {
  const tOrg = await login(emailOrg, passOrg);
  const tAsis = await login(emailAsis, passAsis);

  // 1) Congreso + sesion temporales
  const congreso = await api('POST', '/congresos', tOrg, {
    nombre: 'Congreso E2E Fase 5', fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10',
  });
  const congresoId = congreso.body?.id;
  const sesion = await api('POST', `/congresos/${congresoId}/sesiones`, tOrg, {
    titulo: 'Sesion de prueba', inicio: '2026-11-10T14:00:00Z', fin: '2026-11-10T15:00:00Z',
  });
  const sesionId = sesion.body?.id;
  check('Preparar congreso + sesion -> 201', congreso.status === 201 && sesion.status === 201);

  // 2) El asistente formula una pregunta
  const preg = await api('POST', `/sesiones/${sesionId}/preguntas`, tAsis, {
    texto: '¿Habra material despues de la charla?',
  });
  check('Formular pregunta -> 201 y pendiente', preg.status === 201 && preg.body?.estado === 'pendiente');
  const pregId = preg.body?.id;

  // 3) El asistente NO ve su pregunta pendiente
  const verAsis1 = await api('GET', `/sesiones/${sesionId}/preguntas`, tAsis);
  check('Asistente NO ve la pendiente', verAsis1.status === 200 && !verAsis1.body.some((p) => p.id === pregId));

  // 4) El staff SI ve todas
  const verStaff = await api('GET', `/sesiones/${sesionId}/preguntas`, tOrg);
  check('Staff SI ve la pendiente', verStaff.status === 200 && verStaff.body.some((p) => p.id === pregId));

  // 5) El asistente no puede moderar
  const modAsis = await api('PATCH', `/preguntas/${pregId}`, tAsis, { estado: 'aprobada' });
  check('Asistente NO puede moderar -> 403', modAsis.status === 403);

  // 6) El staff aprueba
  const aprobar = await api('PATCH', `/preguntas/${pregId}`, tOrg, { estado: 'aprobada' });
  check('Staff aprueba -> 200 y aprobada', aprobar.status === 200 && aprobar.body?.estado === 'aprobada');

  // 7) Ahora el asistente SI la ve
  const verAsis2 = await api('GET', `/sesiones/${sesionId}/preguntas`, tAsis);
  check('Asistente ahora SI ve la aprobada', verAsis2.status === 200 && verAsis2.body.some((p) => p.id === pregId));

  // 8) Limpieza
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tOrg);
  check('Borrar congreso (arrastra preguntas) -> 200', borrar.status === 200);

  console.log(fallos === 0
    ? '\n✅ E2E FASE 5 (preguntas) OK — enviar, moderar y vistas por rol'
    : `\n❌ ${fallos} verificacion(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
