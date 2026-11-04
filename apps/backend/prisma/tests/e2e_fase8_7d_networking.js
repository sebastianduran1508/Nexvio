// ==========================================================================
// FASE 8 · Bloque 8.7.d1 — Networking "tipo Tinder" (backend)
//
// Con Ana, Beto y Caro (Caro además es SPEAKER vinculado) en un congreso:
//   1. Las tarjetas: datos públicos, EDAD calculada (nunca el año), insignia
//      PONENTE con sus charlas, y nada privado (documento, teléfono).
//   2. "¿Cómo me ven?": mi propia tarjeta.
//   3. "Ahora no" nunca cuenta para un match; si cambio de opinión, sí.
//   4. Restablecer a los que pasé.
//   5. Interruptor "Aparecer en networking".
//   6. Speakers en Explorar (con y sin cuenta) y el vínculo desde el panel.
//   7. Limpieza.
//
// Uso (desde apps/backend, con el backend corriendo):
//   node prisma/tests/e2e_fase8_7d_networking.js <orgEmail> <orgPass>
// ==========================================================================

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { randomUUID } = require('crypto');

const [, , orgEmail, orgPass] = process.argv;
if (!orgEmail || !orgPass) {
  console.error('Uso: node prisma/tests/e2e_fase8_7d_networking.js <orgEmail> <orgPass>');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;
const okHttp = (s) => s === 200 || s === 201;

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

(async () => {
  console.log('\n=== Bloque 8.7.d1 — networking tipo Tinder ===\n');
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  const tOrg = await login(orgEmail, orgPass);
  if (!tOrg) { console.error('No se pudo entrar con el organizador.'); process.exit(1); }
  const claims = JSON.parse(Buffer.from(tOrg.split('.')[1], 'base64').toString('utf8'));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const enTenant = (fn) => prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${claims.organizacion_id}, true)`;
    return fn(tx);
  }, { maxWait: 15000, timeout: 20000 });

  let congresoId = null;
  const creados = [];
  try {
    // ---------- Preparación ----------
    const c = await api('POST', '/congresos', tOrg, { nombre: `8.7d ${sufijo}`, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-02' });
    congresoId = c.body?.id;
    const p = {};
    for (const [k, nombre] of [['ana', 'Ana'], ['beto', 'Beto'], ['caro', 'Caro']]) {
      const r = await api('POST', `/congresos/${congresoId}/asistentes`, tOrg, {
        nombres: nombre, apellidos: `Red ${sufijo}`, tipo_documento: 'CC', numero_documento: `T7D${k}${sufijo}`, telefono: '3001234567',
      });
      creados.push(r.body?.id);
      const email = (await api('POST', '/auth/resolver-usuario', null, { username: r.body?.username })).body?.email;
      p[k] = { id: r.body?.id, token: await login(email, r.body?.password_temporal) };
    }
    const { ana, beto, caro } = p;
    const pol = await api('GET', '/auth/politica-datos', ana.token);
    for (const x of [ana, beto, caro]) await api('POST', '/auth/aceptar-datos', x.token, { version: pol.body?.version });
    await api('PATCH', '/perfil', beto.token, { cargo: 'Cardiólogo', descripcion: 'Me apasiona la ecocardiografía.', anio_nacimiento: 1990 });

    const fichaCaro = await api('POST', `/congresos/${congresoId}/ponentes`, tOrg, { nombre: 'Dra. Caro', cargo: 'Investigadora' });
    const fichaSin = await api('POST', `/congresos/${congresoId}/ponentes`, tOrg, { nombre: 'Dr. Sin Cuenta', bio: 'Experto invitado' });
    const sesion = await api('POST', `/congresos/${congresoId}/sesiones`, tOrg, { titulo: 'Charla magistral', inicio: '2026-12-01T10:00', fin: '2026-12-01T11:00' });
    await api('POST', `/sesiones/${sesion.body?.id}/ponentes/${fichaCaro.body?.id}`, tOrg);
    await api('POST', `/sesiones/${sesion.body?.id}/ponentes/${fichaSin.body?.id}`, tOrg);
    const vinc = await api('PATCH', `/ponentes/${fichaCaro.body?.id}`, tOrg, { usuario_id: caro.id });
    check(
      'preparación: 3 asistentes con la política aceptada y la ficha de speaker de Caro vinculada',
      !!ana.token && !!beto.token && !!caro.token && okHttp(vinc.status) && vinc.body?.usuario?.id === caro.id,
      `vincular: HTTP ${vinc.status}`,
    );

    const personas = async (x) => (await api('GET', `/congresos/${congresoId}/networking/personas`, x.token)).body ?? [];
    const de = (lista, id) => lista.find((t) => t.id === id);

    console.log('\n-- 1. Las tarjetas');
    const l1 = await personas(ana);
    const tBeto = de(l1, beto.id);
    const tCaro = de(l1, caro.id);
    check('Ana ve a Beto y a Caro (y no a sí misma)', !!tBeto && !!tCaro && !de(l1, ana.id), `${l1.length} tarjetas`);
    check(
      'la tarjeta trae cargo, descripción y la EDAD calculada',
      tBeto?.cargo === 'Cardiólogo' && tBeto?.descripcion?.includes('ecocardiografía') && tBeto?.edad === new Date().getFullYear() - 1990,
      `edad=${tBeto?.edad}`,
    );
    const crudo = JSON.stringify(l1);
    check(
      'nunca viaja el año de nacimiento, el documento ni el teléfono',
      !crudo.includes('anio_nacimiento') && !crudo.includes('numero_documento') && !crudo.includes('3001234567'),
    );
    check('Caro lleva la insignia PONENTE con su charla', tCaro?.insignia === 'ponente' && tCaro?.charlas?.[0]?.titulo === 'Charla magistral');
    check('Beto no lleva insignia (es asistente) y su estado es "ninguno"', tBeto?.insignia === null && tBeto?.estado === 'ninguno');

    console.log('\n-- 2. ¿Cómo me ven?');
    const mia = await api('GET', `/congresos/${congresoId}/networking/mi-tarjeta`, beto.token);
    check('Beto ve su propia tarjeta (igual que los demás) y si está visible', mia.body?.id === beto.id && mia.body?.edad === tBeto?.edad && mia.body?.visible_networking === true);

    console.log('\n-- 3. "Ahora no" y el match');
    const pasa = await api('POST', `/congresos/${congresoId}/networking/pasar`, ana.token, { receptor_id: beto.id });
    check('Ana pasa a Beto ("Ahora no")', okHttp(pasa.status) && pasa.body?.pasado === true);
    check('para Ana, Beto queda como "descartado"', de(await personas(ana), beto.id)?.estado === 'descartado');
    const leGusta = await api('POST', `/congresos/${congresoId}/intereses`, beto.token, { receptor_id: ana.id });
    check('Beto le da 💜 a Ana: NO hay match (ella lo pasó)', okHttp(leGusta.status) && leGusta.body?.match === false);
    check('para Ana, Beto NO aparece como "recibido" (su "Ahora no" manda)', de(await personas(ana), beto.id)?.estado === 'descartado');
    const cambia = await api('POST', `/congresos/${congresoId}/intereses`, ana.token, { receptor_id: beto.id });
    check('Ana cambia de opinión y le da 💜: ¡MATCH!', cambia.body?.match === true && !!cambia.body?.conexionId);
    check('ahora los dos se ven como "correspondido"', de(await personas(beto), ana.id)?.estado === 'correspondido');
    const conex = await api('GET', '/conexiones', ana.token);
    check('las Conexiones traen la foto y el cargo de la otra persona', conex.body?.[0]?.con && 'foto_url' in conex.body[0].con && conex.body[0].con.cargo === 'Cardiólogo');
    // Lo que desbloquea el match: el contacto (solo si la otra persona lo comparte).
    const conexId = cambia.body?.conexionId;
    const c1 = await api('GET', `/conexiones/${conexId}/contacto`, ana.token);
    check(
      'tras el match, el contacto de Beto NO se ve mientras él no lo comparta',
      c1.body?.compartido === false && !('telefono' in (c1.body ?? {})) && !!c1.body?.conectados_desde,
    );
    const linkedinMalo = await api('PATCH', '/perfil', beto.token, { linkedin_url: 'https://facebook.com/beto' });
    check('un enlace que no es de LinkedIn -> 400', linkedinMalo.status === 400);
    await api('PATCH', '/perfil', beto.token, {
      compartir_contacto: true, linkedin_url: 'https://www.linkedin.com/in/beto-prueba', contacto_email: 'beto@prueba.org',
    });
    const c2 = await api('GET', `/conexiones/${conexId}/contacto`, ana.token);
    check(
      'cuando Beto lo comparte, Ana ve su teléfono, correo y LinkedIn',
      c2.body?.compartido === true && c2.body?.telefono === '3001234567' &&
        c2.body?.correo === 'beto@prueba.org' && c2.body?.linkedin?.includes('linkedin.com'),
    );
    await api('PATCH', '/perfil', beto.token, { compartir_telefono: false });
    const cGran = await api('GET', `/conexiones/${conexId}/contacto`, ana.token);
    check(
      'si Beto apaga SOLO el teléfono, Ana ve correo y LinkedIn pero no el teléfono',
      cGran.body?.compartido === true && cGran.body?.telefono === null && cGran.body?.correo === 'beto@prueba.org' && !!cGran.body?.linkedin,
    );
    const c3 = await api('GET', `/conexiones/${conexId}/contacto`, caro.token);
    check('alguien que no es parte de la conexión no ve nada (404)', c3.status === 404);
    const pasarMatch = await api('POST', `/congresos/${congresoId}/networking/pasar`, ana.token, { receptor_id: beto.id });
    check('un match no se puede "pasar"', pasarMatch.body?.pasado === false);

    console.log('\n-- 4. Restablecer');
    await api('POST', `/congresos/${congresoId}/networking/pasar`, ana.token, { receptor_id: caro.id });
    const rest = await api('POST', `/congresos/${congresoId}/networking/restablecer`, ana.token);
    check('restablecer devuelve a Caro a Descubrir', rest.body?.restablecidos === 1 && de(await personas(ana), caro.id)?.estado === 'ninguno');

    console.log('\n-- 5. Aparecer en networking');
    const oculta = await api('PATCH', '/perfil', caro.token, { visible_networking: false });
    check('Caro apaga "Aparecer en networking"', oculta.body?.visible_networking === false);
    check('Ana ya no la ve', !de(await personas(ana), caro.id));
    const aOculta = await api('POST', `/congresos/${congresoId}/intereses`, ana.token, { receptor_id: caro.id });
    check('y no se le puede dar 💜 (404)', aOculta.status === 404);
    await api('PATCH', '/perfil', caro.token, { visible_networking: true });
    check('al encenderlo, vuelve a aparecer', !!de(await personas(ana), caro.id));

    console.log('\n-- 6. Speakers y el vínculo desde el panel');
    const ponentes = (await api('GET', `/congresos/${congresoId}/networking/ponentes`, ana.token)).body ?? [];
    const pc = ponentes.find((x) => x.id === fichaCaro.body?.id);
    const ps = ponentes.find((x) => x.id === fichaSin.body?.id);
    check('Explorar → Ponentes trae a los dos, con sus charlas', pc?.usuario_id === caro.id && ps?.usuario_id === null && ps?.charlas?.length === 1);
    const otraVez = await api('PATCH', `/ponentes/${fichaSin.body?.id}`, tOrg, { usuario_id: caro.id });
    check('una cuenta no puede ser dos speakers (409)', otraVez.status === 409, otraVez.body?.message);
    const noInscrito = await api('PATCH', `/ponentes/${fichaSin.body?.id}`, tOrg, { usuario_id: claims.sub });
    check('no se puede vincular a alguien que no está inscrito (400)', noInscrito.status === 400);
    const desv = await api('PATCH', `/ponentes/${fichaCaro.body?.id}`, tOrg, { usuario_id: null });
    check('desvincular (null) quita la insignia', okHttp(desv.status) && de(await personas(ana), caro.id)?.insignia === null);
  } finally {
    console.log('\n-- 7. Limpieza');
    if (congresoId) await api('DELETE', `/congresos/${congresoId}`, tOrg);
    await enTenant(async (tx) => {
      for (const id of creados.filter(Boolean)) {
        await tx.consentimientoDatos.deleteMany({ where: { usuario_id: id } });
        await tx.usuario.delete({ where: { id } }).catch(() => undefined);
      }
    });
    for (const id of creados.filter(Boolean)) {
      await fetch(`${SUPA}/auth/v1/admin/users/${id}`, {
        method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      }).catch(() => undefined);
    }
    await prisma.$disconnect();
    check('datos de prueba borrados', true);
  }

  const fallos = resultados.filter((r) => !r.ok);
  console.log(
    fallos.length === 0
      ? `\nTODO VERDE — ${resultados.length} comprobaciones pasaron. Backend del 8.7.d1 listo.`
      : `\nFALLARON ${fallos.length} de ${resultados.length}: ` + fallos.map((f) => f.nombre).join(' | '),
  );
  process.exit(fallos.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR de ejecucion:', e.message);
  process.exit(1);
});
