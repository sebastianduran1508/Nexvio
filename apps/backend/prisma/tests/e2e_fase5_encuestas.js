// ==========================================================================
// FASE 5 — Prueba END-TO-END de las encuestas en vivo.
//
//   1. El organizador crea congreso + sesion temporales.
//   2. El staff crea una encuesta con 2 opciones (nace CERRADA).
//   3. El asistente NO la ve (no esta activa) y NO puede votar (400).
//   4. El staff la ABRE (PATCH activa=true).
//   5. El asistente ya la ve y VOTA -> 200, total=1, miVoto = opcion elegida.
//   6. Votar de nuevo -> 409 (un voto por persona).
//   7. Resultados: la opcion votada tiene 1 voto.
//   8. El asistente NO puede crear encuestas (403).
//   9. Limpieza: borrar el congreso.
//
// Uso (desde apps/backend):
//   node prisma/tests/e2e_fase5_encuestas.js <emailOrg> <passOrg> <emailAsistente> <passAsistente>
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
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

(async () => {
  const tOrg = await login(emailOrg, passOrg);
  const tAsis = await login(emailAsis, passAsis);

  // 1) Congreso + sesion
  const congreso = await api('POST', '/congresos', tOrg, {
    nombre: 'Congreso E2E Encuestas', fecha_inicio: '2026-11-11', fecha_fin: '2026-11-11',
  });
  const congresoId = congreso.body?.id;
  const sesion = await api('POST', `/congresos/${congresoId}/sesiones`, tOrg, {
    titulo: 'Sesion encuestas', inicio: '2026-11-11T14:00:00Z', fin: '2026-11-11T15:00:00Z',
  });
  const sesionId = sesion.body?.id;
  check('Preparar congreso + sesion', congreso.status === 201 && sesion.status === 201);

  // 2) Crear encuesta (nace cerrada)
  const crear = await api('POST', `/sesiones/${sesionId}/encuestas`, tOrg, {
    pregunta: '¿Que tema prefieres?',
    opciones: ['Cardiologia', 'Neurologia'],
  });
  check('Crear encuesta -> 201, cerrada, 2 opciones',
    crear.status === 201 && crear.body?.activa === false && crear.body?.opciones?.length === 2);
  const encuestaId = crear.body?.id;
  const opcionA = crear.body?.opciones?.[0]?.id;

  // 3) Asistente no la ve (cerrada) y no puede votar
  const verCerrada = await api('GET', `/sesiones/${sesionId}/encuestas`, tAsis);
  check('Asistente NO ve la encuesta cerrada',
    verCerrada.status === 200 && !verCerrada.body.some((e) => e.id === encuestaId));
  const votoCerrada = await api('POST', `/encuestas/${encuestaId}/votar`, tAsis, { opcion_id: opcionA });
  check('Votar en encuesta cerrada -> 400', votoCerrada.status === 400);

  // 4) El staff la abre
  const abrir = await api('PATCH', `/encuestas/${encuestaId}`, tOrg, { activa: true });
  check('Abrir encuesta -> 200 y activa', abrir.status === 200 && abrir.body?.activa === true);

  // 5) Asistente vota
  const verActiva = await api('GET', `/sesiones/${sesionId}/encuestas`, tAsis);
  check('Asistente ya ve la encuesta activa',
    verActiva.status === 200 && verActiva.body.some((e) => e.id === encuestaId));
  const voto = await api('POST', `/encuestas/${encuestaId}/votar`, tAsis, { opcion_id: opcionA });
  check('Votar -> 201, total=1, miVoto correcto',
    voto.status === 201 && voto.body?.total === 1 && voto.body?.miVoto === opcionA);

  // 6) No puede votar dos veces
  const voto2 = await api('POST', `/encuestas/${encuestaId}/votar`, tAsis, { opcion_id: opcionA });
  check('Votar de nuevo -> 409', voto2.status === 409);

  // 7) Resultados
  const res = await api('GET', `/encuestas/${encuestaId}/resultados`, tOrg);
  const opA = res.body?.opciones?.find((o) => o.id === opcionA);
  check('Resultados: la opcion votada tiene 1 voto', res.status === 200 && opA?.votos === 1);

  // 8) Asistente no puede crear encuestas
  const crearAsis = await api('POST', `/sesiones/${sesionId}/encuestas`, tAsis, {
    pregunta: 'x', opciones: ['a', 'b'],
  });
  check('Asistente NO puede crear encuestas -> 403', crearAsis.status === 403);

  // 9) Limpieza
  const borrar = await api('DELETE', `/congresos/${congresoId}`, tOrg);
  check('Borrar congreso -> 200', borrar.status === 200);

  console.log(fallos === 0
    ? '\n✅ E2E FASE 5 (encuestas) OK — crear, abrir, votar (1 voto) y resultados'
    : `\n❌ ${fallos} verificacion(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
