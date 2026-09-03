// ==========================================================================
// SEED DEMO — carga una agenda de ejemplo a un congreso, para que la app movil
// muestre sesiones y ponentes en la sustentacion.
//
// Es IDEMPOTENTE: si el congreso ya tiene sesiones, no agrega nada.
// Usa el backend real (mismos endpoints que la app), con el token del organizador.
//
// Requiere backend corriendo y en .env: SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Uso (desde apps/backend):
//   node prisma/setup/06_seed_agenda_demo.js <emailOrganizador> <passOrganizador> ["Nombre del congreso"]
//   (si no das nombre, usa "Congreso de Medicina")
// ==========================================================================

require('dotenv/config');

const [, , email, pass, nombreArg] = process.argv;
const NOMBRE = nombreArg || 'Congreso de Medicina';
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

async function login(e, p) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e, password: p }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login fallo: ' + JSON.stringify(j));
  return j.access_token;
}

async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  const token = await login(email, pass);

  // 1) Buscar el congreso por nombre.
  const congresos = await api('GET', '/congresos', token);
  const congreso = congresos.find((c) => c.nombre === NOMBRE);
  if (!congreso) {
    throw new Error(`No se encontro el congreso "${NOMBRE}" en tu organizacion.`);
  }

  // 2) Si ya tiene agenda, no duplicar.
  const detalle = await api('GET', `/congresos/${congreso.id}`, token);
  if (detalle.sesiones.length > 0) {
    console.log(`ℹ️  "${NOMBRE}" ya tiene ${detalle.sesiones.length} sesion(es). No se agrega nada.`);
    return;
  }

  // 3) Tomamos el dia de inicio del congreso para poner las sesiones ahi.
  const dia = congreso.fecha_inicio.slice(0, 10); // "YYYY-MM-DD"

  const s1 = await api('POST', `/congresos/${congreso.id}/sesiones`, token, {
    titulo: 'Conferencia inaugural: avances en cardiologia',
    inicio: `${dia}T09:00:00Z`,
    fin: `${dia}T10:30:00Z`,
    sala: 'Auditorio principal',
  });
  await api('POST', `/congresos/${congreso.id}/sesiones`, token, {
    titulo: 'Taller: manejo de urgencias',
    inicio: `${dia}T11:00:00Z`,
    fin: `${dia}T12:30:00Z`,
    sala: 'Sala B',
  });

  const ponente = await api('POST', `/congresos/${congreso.id}/ponentes`, token, {
    nombre: 'Dra. Ana Rios',
    bio: 'Cardiologa, 15 anos de experiencia en investigacion clinica.',
  });

  // Asignamos la ponente a la sesion inaugural.
  await api('POST', `/sesiones/${s1.id}/ponentes/${ponente.id}`, token);

  console.log(`✅ Agenda demo cargada en "${NOMBRE}": 2 sesiones + 1 ponente.`);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
