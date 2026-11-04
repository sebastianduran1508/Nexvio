// ==========================================================================
// FASE 8 · Bloque 8.7.c1 — Perfil y Ley 1581 (backend)
//
// Con dos asistentes (Ana y Beto) en un congreso de prueba:
//   1. Datos legales de la organización: validan y aparecen en la política.
//   2. Perfil propio: ver (documento enmascarado), editar SOLO lo permitido.
//   3. Foto de perfil: sube una imagen real, rechaza una falsa, se quita.
//   4. Revocar: Beto desaparece del networking, queda en el historial y, al
//      volver a aceptar, reaparece.
//   5. Solicitudes: pedir supresión, rechazar (con motivo) y SUPRIMIR (Ana
//      queda anonimizada, sin cuenta, sin chats, sin inscripciones).
//   6. Limpieza (incluye devolver los datos legales como estaban).
//
// Uso (desde apps/backend, con el backend corriendo y el bucket de Storage):
//   node prisma/tests/e2e_fase8_7c_perfil_legal.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7c_perfil_legal.js <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const okHttp = (s) => s === 200 || s === 201;

// Una imagen PNG real de 1x1 píxel (la firma "\x89PNG" es lo que revisa el backend).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '  ok  ' : ' FALLA'} | ${nombre}${detalle ? '  -> ' + detalle : ''}`);
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

async function subir(path, token, buffer, tipo) {
  const form = new FormData();
  form.append('archivo', new Blob([buffer], { type: tipo }), 'foto.png');
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, body: data };
}

(async () => {
  console.log('\n=== Bloque 8.7.c1 — perfil y Ley 1581 ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  // maxWait/timeout: la misma "paciencia" que runInTenant en el backend. Por
  // defecto Prisma solo espera 2 s una conexión, y con Supabase a veces no basta.
  const enTenant = (fn) => prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
    return fn(tx);
  }, { maxWait: 15000, timeout: 20000 });

  let congresoId = null;
  const creados = [];
  const legalAntes = (await api('GET', '/organizacion/datos-legales', tOrg)).body;

  try {
    // ---------- Preparación: congreso + Ana y Beto (aceptan la política) ----------
    const c = await api('POST', '/congresos', tOrg, { nombre: `8.7c ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' });
    congresoId = c.body?.id;
    const personas = {};
    for (const [clave, nombre, doc] of [['ana', 'Ana', `T7CA${sufijo}`], ['beto', 'Beto', `T7CB${sufijo}`]]) {
      const r = await api('POST', `/congresos/${congresoId}/asistentes`, tOrg, {
        nombres: nombre, apellidos: `Prueba ${sufijo}`, tipo_documento: 'CC', numero_documento: doc,
      });
      creados.push(r.body?.id);
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: r.body?.username })).body?.email;
      const token = await login(email, r.body?.password_temporal);
      personas[clave] = { id: r.body?.id, email, pass: r.body?.password_temporal, token };
    }
    const { ana, beto } = personas;
    const pol0 = await api('GET', '/auth/politica-datos', ana.token);
    for (const p of [ana, beto]) await api('POST', '/auth/aceptar-datos', p.token, { version: pol0.body?.version });
    check('preparación: congreso, Ana y Beto creados y con la política aceptada', !!ana.token && !!beto.token && !!pol0.body?.version);

    console.log('\n-- 1. Datos legales de la organización');
    const malNit = await api('PATCH', '/organizacion/datos-legales', tOrg, { legal_nit: 'abc' });
    const malUrl = await api('PATCH', '/organizacion/datos-legales', tOrg, { legal_url_politica: 'http://inseguro.com' });
    check('NIT con letras y enlace sin https -> 400', malNit.status === 400 && malUrl.status === 400);
    const guarda = await api('PATCH', '/organizacion/datos-legales', tOrg, {
      legal_razon_social: `Asociación de Prueba ${sufijo} S.A.S.`,
      legal_nit: '900.123.456-7',
      legal_direccion: 'Calle 100 # 10-20',
      legal_ciudad: 'Bogotá',
      legal_correo: 'datos@prueba.org',
      legal_telefono: '601 555 1234',
      legal_area: 'Atención al asociado',
    });
    check('el organizador guarda los datos legales', guarda.status === 200 && guarda.body?.legal_nit === '900.123.456-7', `HTTP ${guarda.status}`);
    const asisLegal = await api('PATCH', '/organizacion/datos-legales', ana.token, { legal_nit: '1' });
    check('un asistente NO puede editarlos (403)', asisLegal.status === 403);
    const pol = await api('GET', '/auth/politica-datos', ana.token);
    const texto = JSON.stringify(pol.body?.secciones ?? []);
    check(
      'la política ahora trae razón social, NIT, correo, área y vigencia (art. 13)',
      pol.body?.responsable?.startsWith('Asociación de Prueba') && texto.includes('900.123.456-7') &&
        texto.includes('datos@prueba.org') && texto.includes('Atención al asociado') && !!pol.body?.vigente_desde,
      pol.body?.version,
    );

    console.log('\n-- 2. Perfil propio');
    const perfil = await api('GET', '/perfil', ana.token);
    check(
      've su perfil con el documento ENMASCARADO y la lista de campos editables',
      perfil.status === 200 && perfil.body?.numero_documento?.startsWith('••••') &&
        (perfil.body?.editables ?? []).includes('cargo'),
      perfil.body?.numero_documento,
    );
    const edita = await api('PATCH', '/perfil', ana.token, { cargo: 'Médica internista', empresa: 'Clínica Norte', pais: 'Colombia', pais_codigo: 'co', telefono: '+57 300 123 4567' });
    check('edita cargo, empresa, país y teléfono (el código de país queda en mayúsculas)', edita.body?.cargo === 'Médica internista' && edita.body?.pais_codigo === 'CO');
    const cambiaNombre = await api('PATCH', '/perfil', ana.token, { nombre: 'Otra Persona' });
    check('NO puede cambiar su nombre (400: campo no permitido)', cambiaNombre.status === 400);
    const telMalo = await api('PATCH', '/perfil', ana.token, { telefono: 'llámame' });
    check('teléfono inválido -> 400', telMalo.status === 400);
    const borra = await api('PATCH', '/perfil', ana.token, { telefono: '' });
    check('texto vacío borra el dato (teléfono -> null)', borra.body?.telefono === null);

    console.log('\n-- 3. Foto de perfil');
    const foto = await subir('/perfil/foto', ana.token, PNG, 'image/png');
    check('sube una foto real (PNG)', okHttp(foto.status) && !!foto.body?.foto_url, `HTTP ${foto.status}`);
    const falsa = await subir('/perfil/foto', ana.token, Buffer.from('esto no es una imagen'), 'image/png');
    check('rechaza un archivo que solo DICE ser imagen (400)', falsa.status === 400);
    const sinFoto = await api('DELETE', '/perfil/foto', ana.token);
    check('quita la foto (vuelven las iniciales)', sinFoto.body?.foto_url === null);

    console.log('\n-- 4. Revocar la autorización');
    const ve = async () => ((await api('GET', `/congresos/${congresoId}/networking`, ana.token)).body ?? []).some((x) => x.usuario?.id === beto.id);
    check('antes: Ana ve a Beto en el networking', await ve());
    const rev = await api('POST', '/auth/revocar-datos', beto.token);
    check('Beto revoca su autorización', okHttp(rev.status) && rev.body?.revocado === true, `HTTP ${rev.status}`);
    const yoBeto = await api('GET', '/auth/yo', beto.token);
    check('a Beto se le vuelve a pedir aceptar (la app no lo deja entrar)', yoBeto.body?.requiere_aceptar_datos === true);
    check('Beto DESAPARECE del networking de Ana', !(await ve()));
    const interes = await api('POST', `/congresos/${congresoId}/intereses`, ana.token, { receptor_id: beto.id });
    check('tampoco se le puede enviar interés (404)', interes.status === 404, `HTTP ${interes.status}`);
    const rev2 = await api('POST', '/auth/revocar-datos', beto.token);
    check('revocar dos veces -> 409', rev2.status === 409);
    await api('POST', '/auth/aceptar-datos', beto.token, { version: pol.body?.version });
    check('al volver a aceptar, Beto reaparece', await ve());
    const historial = await enTenant((tx) => tx.consentimientoDatos.findMany({ where: { usuario_id: beto.id }, orderBy: { creado_en: 'asc' } }));
    check(
      'el HISTORIAL guarda todo: acepta -> revoca -> acepta',
      historial.map((h) => h.accion).join(',') === 'acepta,revoca,acepta',
      historial.map((h) => h.accion).join(','),
    );

    console.log('\n-- 5. Solicitudes de supresión');
    const sol = await api('POST', '/perfil/solicitudes', ana.token, { motivo: 'Ya no asistiré a más eventos' });
    check('Ana pide la supresión de sus datos', okHttp(sol.status) && sol.body?.estado === 'pendiente');
    const dup = await api('POST', '/perfil/solicitudes', ana.token, {});
    check('otra igual mientras la primera está en trámite -> 409', dup.status === 409);
    const bandeja = await api('GET', '/solicitudes-datos', tOrg);
    const enBandeja = (bandeja.body ?? []).find((s) => s.id === sol.body?.id);
    const dias = enBandeja ? (new Date(enBandeja.vence_en) - new Date(enBandeja.creado_en)) / 86400000 : 0;
    check('el organizador la ve en su bandeja con el plazo legal (15 días hábiles)', !!enBandeja && dias >= 19 && dias <= 23, `${Math.round(dias)} días calendario`);
    const asisBandeja = await api('GET', '/solicitudes-datos', ana.token);
    check('un asistente NO ve la bandeja (403)', asisBandeja.status === 403);

    const solB = await api('POST', '/perfil/solicitudes', beto.token, {});
    const corto = await api('POST', `/solicitudes-datos/${solB.body?.id}/rechazar`, tOrg, { respuesta: 'No' });
    check('rechazar sin explicar el motivo -> 400', corto.status === 400);
    const rechaza = await api('POST', `/solicitudes-datos/${solB.body?.id}/rechazar`, tOrg, { respuesta: 'Debemos conservar tus datos para emitir tu certificado de asistencia.' });
    const misB = await api('GET', '/perfil/solicitudes', beto.token);
    check('rechazada con motivo, y Beto ve la respuesta', okHttp(rechaza.status) && misB.body?.[0]?.estado === 'rechazada' && !!misB.body?.[0]?.respuesta);

    // Ana y Beto hacen match y chatean, para comprobar que la supresión limpia el chat.
    await api('POST', `/congresos/${congresoId}/intereses`, ana.token, { receptor_id: beto.id });
    await api('POST', `/congresos/${congresoId}/intereses`, beto.token, { receptor_id: ana.id });
    const conexB = await api('GET', '/conexiones', beto.token);
    const conexId = conexB.body?.[0]?.id ?? conexB.body?.[0]?.conexionId;
    if (conexId) await api('POST', `/conexiones/${conexId}/mensajes`, ana.token, { texto: 'Hola Beto, soy Ana' });
    check('preparación: Ana y Beto tienen una conexión con un mensaje', !!conexId);

    const sup = await api('POST', `/solicitudes-datos/${sol.body?.id}/suprimir`, tOrg, {});
    check('el organizador SUPRIME los datos de Ana', okHttp(sup.status) && sup.body?.suprimido === true, `HTTP ${sup.status} ${sup.body?.message ?? ''}`);
    const anaLogin = await login(ana.email, ana.pass);
    check('Ana ya no puede iniciar sesión (su cuenta se borró)', !anaLogin);
    const anaFila = await enTenant((tx) => tx.usuario.findFirst({ where: { id: ana.id } }));
    check(
      'su fila quedó ANÓNIMA (sin nombre, documento, cargo ni usuario)',
      anaFila?.nombre === 'Asistente eliminado' && anaFila?.numero_documento === null &&
        anaFila?.cargo === null && anaFila?.username === null && !!anaFila?.suprimido_en,
    );
    const anaInsc = await enTenant((tx) => tx.inscripcion.count({ where: { usuario_id: ana.id } }));
    const conexDespues = await api('GET', '/conexiones', beto.token);
    check('sin inscripciones, y su chat con Beto desapareció', anaInsc === 0 && (conexDespues.body ?? []).length === 0);
    const solFinal = await enTenant((tx) => tx.solicitudDatos.findFirst({ where: { id: sol.body?.id } }));
    check('la solicitud quedó "atendida"', solFinal?.estado === 'atendida' && !!solFinal?.atendida_en);
    const otra = await api('POST', `/solicitudes-datos/${sol.body?.id}/suprimir`, tOrg, {});
    check('atenderla otra vez -> 409', otra.status === 409);
  } finally {
    console.log('\n-- 6. Limpieza');
    if (congresoId) await api('DELETE', `/congresos/${congresoId}`, tOrg);
    if (legalAntes) {
      const { nombre, ...campos } = legalAntes;
      const restaurar = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v ?? '']));
      await api('PATCH', '/organizacion/datos-legales', tOrg, restaurar);
    }
    await enTenant(async (tx) => {
      for (const id of creados.filter(Boolean)) {
        await tx.solicitudDatos.deleteMany({ where: { usuario_id: id } });
        await tx.consentimientoDatos.deleteMany({ where: { usuario_id: id } });
        await tx.inscripcion.deleteMany({ where: { usuario_id: id } });
        await tx.usuario.delete({ where: { id } }).catch(() => undefined);
      }
    });
    for (const id of creados.filter(Boolean)) {
      await fetch(`${SUPA}/auth/v1/admin/users/${id}`, {
        method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      }).catch(() => undefined);
    }
    await prisma.$disconnect();
    check('datos de prueba borrados y datos legales restaurados', true);
  }

  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.7.c1 listo.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '),
  );
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR de ejecucion:', e.message);
  process.exit(1);
});
