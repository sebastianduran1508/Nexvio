// ==========================================================================
// SEED FERIA — datos de demostración para mostrar Nexvio en público.
//
// Crea (o completa, si ya existen):
//   - Org A (la de Medicina que ya existe): un congreso NUEVO de 2 días.
//   - Org B "Sociedad Colombiana de Ingeniería de Software" + TechConf Bogotá.
//   - Org C "Red Latinoamericana de Educación Digital" + EduInnova Medellín.
//   Cada congreso: agenda de 2 días (charlas, talleres, breaks), 6 ponentes con
//   ficha completa, y asistentes (algunos con correo para entrar a la app).
//
// Sirve para demostrar el AISLAMIENTO: cada organización ve solo lo suyo.
//
// Es IDEMPOTENTE: se puede correr varias veces. Lo que ya existe se salta.
//
// Todo pasa por la API REAL (igual que el panel), con la cuenta del
// superadmin y la cabecera X-Organizacion-Id para trabajar dentro de cada
// organización (Bloque 8.2). Así el seed también prueba el RLS.
//
// Requisitos: backend corriendo + en .env: SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY (esta última para fijar contraseñas conocidas).
//
// Uso (desde apps/backend):
//   node prisma/setup/11_seed_feria.js <emailSuperadmin> <passSuperadmin> [slugOrgA]
// Si no das slugOrgA, se busca la organización cuyo nombre contenga "medic".
// ==========================================================================

require('dotenv/config');

const [, , ADMIN_EMAIL, ADMIN_PASS, SLUG_ORG_A] = process.argv;
if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Uso: node prisma/setup/11_seed_feria.js <emailSuperadmin> <passSuperadmin> [slugOrgA]');
  process.exit(1);
}

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `http://localhost:${process.env.PORT || 3000}`;

// Contraseñas CONOCIDAS para la demo (solo cuentas de prueba).
const CLAVE_ORGANIZADOR = 'Nexvio2026!';
const CLAVE_ASISTENTE = 'asistente123';

// --------------------------------------------------------------------------
// Utilidades HTTP
// --------------------------------------------------------------------------

async function login(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login del superadmin falló: ' + JSON.stringify(j));
  return j.access_token;
}

/** Llama a la API. Si se pasa orgId, trabaja "dentro" de esa organización. */
async function api(token, method, path, body, orgId) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(orgId ? { 'X-Organizacion-Id': orgId } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    const err = new Error(`${method} ${path} -> ${r.status}: ${JSON.stringify(data)}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

/**
 * Fija una contraseña conocida a una cuenta de Supabase Auth (como
 * 09_cambiar_password.js). Recorre las páginas del listado de usuarios
 * porque la Admin API no filtra por correo de forma fiable.
 */
async function fijarPassword(email, password) {
  if (!SERVICE) {
    console.warn(`   ⚠️  Sin SUPABASE_SERVICE_ROLE_KEY: no se fijó la clave de ${email}`);
    return;
  }
  const headers = {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    'Content-Type': 'application/json',
  };
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${SUPA}/auth/v1/admin/users?page=${page}&per_page=200`, { headers });
    const j = await r.json();
    const lista = j.users ?? [];
    const u = lista.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
    if (u) {
      const c = await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password, email_confirm: true }),
      });
      if (!c.ok) console.warn(`   ⚠️  No se pudo fijar la clave de ${email}`);
      return;
    }
    if (lista.length < 200) break; // no hay más páginas
  }
  console.warn(`   ⚠️  No se encontró ${email} en Auth`);
}

// --------------------------------------------------------------------------
// Los datos
// --------------------------------------------------------------------------
// Las horas se escriben en hora de Colombia ("-05:00"); la API las guarda en
// UTC y la app las vuelve a mostrar en la hora local del teléfono.
// Cada fila de la agenda: [día, inicio, fin, tipo, título, sala, ponentes]
// donde "ponentes" son los índices (posición) en la lista de ponentes.

const DATOS = [
  // ------------------------------------------------------------------ ORG A
  {
    existente: true, // se busca, no se crea
    congreso: {
      nombre: 'Congreso Nacional de Cardiología 2026',
      fecha_inicio: '2026-10-24',
      fecha_fin: '2026-10-25',
      estado: 'publicado',
      descripcion: 'Dos días de actualización en cardiología clínica, imagen cardiovascular e innovación en salud.',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      pais_codigo: 'CO',
      lugar: 'Centro de Convenciones Andino',
    },
    ponentes: [
      { nombre: 'Dra. Ana Ríos', cargo: 'Cardióloga intervencionista', empresa: 'Instituto Cardiológico Andino', pais: 'Colombia', pais_codigo: 'CO', bio: 'Quince años en investigación clínica y hemodinamia.' },
      { nombre: 'Dr. Mateo Salazar', cargo: 'Jefe de Electrofisiología', empresa: 'Clínica Vida Plena', pais: 'México', pais_codigo: 'MX', bio: 'Pionero en ablación de arritmias complejas.' },
      { nombre: 'Dra. Lucía Fernández', cargo: 'Investigadora en imagen cardiovascular', empresa: 'Hospital Universitario del Sur', pais: 'Argentina', pais_codigo: 'AR', bio: 'Resonancia y tomografía cardíaca aplicadas a la práctica diaria.' },
      { nombre: 'Dr. Andrés Guzmán', cargo: 'Director de Rehabilitación Cardíaca', empresa: 'Fundación Corazón Activo', pais: 'Colombia', pais_codigo: 'CO', bio: 'Programas de rehabilitación con enfoque comunitario.' },
      { nombre: 'Dra. Carmen Ortega', cargo: 'Especialista en IA médica', empresa: 'Universidad Iberoamericana de Salud', pais: 'España', pais_codigo: 'ES', bio: 'Modelos de inteligencia artificial para diagnóstico temprano.' },
      { nombre: 'Dr. Felipe Rojas', cargo: 'Cardiólogo pediatra', empresa: 'Hospital Infantil Los Andes', pais: 'Chile', pais_codigo: 'CL', bio: 'Cardiopatías congénitas y seguimiento a largo plazo.' },
    ],
    agenda: [
      // Día 1
      ['2026-10-24', '07:30', '08:30', 'break', 'Registro y café de bienvenida', 'Lobby', []],
      ['2026-10-24', '08:30', '09:30', 'plenaria', 'Conferencia inaugural: el futuro de la cardiología', 'Auditorio principal', [0]],
      ['2026-10-24', '09:30', '10:30', 'charla', 'Arritmias complejas: lo que todo clínico debe saber', 'Auditorio principal', [1]],
      ['2026-10-24', '10:30', '11:00', 'break', 'Café y networking', 'Zona de exhibición', []],
      ['2026-10-24', '11:00', '12:00', 'charla', 'Imagen cardiovascular en la práctica diaria', 'Sala A', [2]],
      ['2026-10-24', '12:00', '13:30', 'break', 'Almuerzo', 'Restaurante', []],
      ['2026-10-24', '13:30', '15:00', 'taller', 'Taller: lectura rápida de electrocardiogramas', 'Sala B', [1, 0]],
      ['2026-10-24', '15:00', '16:00', 'charla', 'Inteligencia artificial para el diagnóstico temprano', 'Auditorio principal', [4]],
      ['2026-10-24', '16:00', '17:00', 'charla', 'Panel: retos de la cardiología en Latinoamérica', 'Auditorio principal', [0, 3, 5]],
      // Día 2
      ['2026-10-25', '08:00', '09:00', 'charla', 'Cardiopatías congénitas: del niño al adulto', 'Auditorio principal', [5]],
      ['2026-10-25', '09:00', '10:00', 'charla', 'Rehabilitación cardíaca basada en la comunidad', 'Sala A', [3]],
      ['2026-10-25', '10:00', '10:30', 'break', 'Café', 'Zona de exhibición', []],
      ['2026-10-25', '10:30', '12:00', 'taller', 'Taller: ecocardiografía básica', 'Sala B', [2]],
      ['2026-10-25', '12:00', '13:30', 'break', 'Almuerzo', 'Restaurante', []],
      ['2026-10-25', '13:30', '14:30', 'charla', 'Casos clínicos interactivos', 'Auditorio principal', [0, 1]],
      ['2026-10-25', '14:30', '15:30', 'plenaria', 'Clausura y conclusiones', 'Auditorio principal', [4, 0]],
    ],
    asistentes: [
      { nombres: 'Valentina', apellidos: 'Gómez Arias', tipo_documento: 'CC', numero_documento: 'FER-A-001', cargo: 'Residente de cardiología', empresa: 'Hospital San Rafael', tipo_suscripcion: 'Residente' },
      { nombres: 'Santiago', apellidos: 'Pérez Lozano', tipo_documento: 'CC', numero_documento: 'FER-A-002', cargo: 'Médico general', empresa: 'Clínica del Norte', tipo_suscripcion: 'General' },
      { nombres: 'Daniela', apellidos: 'Martínez Ruiz', tipo_documento: 'CC', numero_documento: 'FER-A-003', cargo: 'Enfermera jefe', empresa: 'Instituto Cardiológico Andino', tipo_suscripcion: 'General' },
      { nombres: 'Juan Pablo', apellidos: 'García Mora', tipo_documento: 'CC', numero_documento: 'FER-A-004', cargo: 'Cardiólogo', empresa: 'Clínica Vida Plena', tipo_suscripcion: 'Miembro' },
      { nombres: 'Isabella', apellidos: 'Castro Vega', tipo_documento: 'CE', numero_documento: 'FER-A-005', cargo: 'Investigadora', empresa: 'Universidad del Pacífico', tipo_suscripcion: 'Miembro', pais: 'Perú', pais_codigo: 'PE' },
    ],
  },

  // ------------------------------------------------------------------ ORG B
  {
    org: {
      nombre: 'Sociedad Colombiana de Ingeniería de Software',
      slug: 'sc-ingenieria-software',
      organizador: { email: 'org.software@nexvio.dev', password: CLAVE_ORGANIZADOR, nombre: 'Laura Méndez' },
    },
    congreso: {
      nombre: 'TechConf Bogotá 2026',
      fecha_inicio: '2026-11-12',
      fecha_fin: '2026-11-13',
      estado: 'publicado',
      descripcion: 'El encuentro de ingeniería de software: arquitectura, nube, IA y buenas prácticas.',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      pais_codigo: 'CO',
      lugar: 'Centro de Eventos La Sabana',
    },
    ponentes: [
      { nombre: 'Camila Restrepo', cargo: 'Arquitecta de software principal', empresa: 'Nubetech Labs', pais: 'Colombia', pais_codigo: 'CO', bio: 'Diseña plataformas SaaS multi-tenant a gran escala.' },
      { nombre: 'Diego Hernández', cargo: 'Ingeniero de plataforma', empresa: 'Cumbre Cloud', pais: 'México', pais_codigo: 'MX', bio: 'Kubernetes, observabilidad y cultura DevOps.' },
      { nombre: 'Sofía Navarro', cargo: 'Líder de IA aplicada', empresa: 'DataAndes', pais: 'Chile', pais_codigo: 'CL', bio: 'Modelos de lenguaje en productos reales.' },
      { nombre: 'Martín Acosta', cargo: 'Especialista en seguridad', empresa: 'Escudo Digital', pais: 'Argentina', pais_codigo: 'AR', bio: 'Seguridad de aplicaciones y respuesta a incidentes.' },
      { nombre: 'Paula Jiménez', cargo: 'Product Manager', empresa: 'Kolibri Apps', pais: 'Colombia', pais_codigo: 'CO', bio: 'Producto, métricas y experiencia de usuario.' },
      { nombre: 'Ricardo Vargas', cargo: 'Profesor de ingeniería', empresa: 'Universidad Tecnológica del Valle', pais: 'Perú', pais_codigo: 'PE', bio: 'Enseñanza de arquitectura y metodologías ágiles.' },
    ],
    agenda: [
      ['2026-11-12', '08:00', '08:45', 'break', 'Registro y café', 'Lobby', []],
      ['2026-11-12', '08:45', '09:45', 'plenaria', 'Keynote: arquitecturas SaaS multi-tenant', 'Auditorio Sabana', [0]],
      ['2026-11-12', '09:45', '10:45', 'charla', 'Observabilidad: logs, métricas y trazas', 'Sala Nube', [1]],
      ['2026-11-12', '10:45', '11:15', 'break', 'Café y networking', 'Zona de stands', []],
      ['2026-11-12', '11:15', '12:15', 'charla', 'LLMs en producción: lecciones aprendidas', 'Auditorio Sabana', [2]],
      ['2026-11-12', '12:15', '13:30', 'break', 'Almuerzo', 'Terraza', []],
      ['2026-11-12', '13:30', '15:00', 'taller', 'Taller: despliegue continuo con contenedores', 'Laboratorio 1', [1]],
      ['2026-11-12', '15:00', '16:00', 'charla', 'Seguridad desde el diseño', 'Sala Nube', [3]],
      ['2026-11-12', '16:00', '17:00', 'charla', 'Panel: el ingeniero de software en la era de la IA', 'Auditorio Sabana', [0, 2, 5]],
      ['2026-11-13', '08:30', '09:30', 'charla', 'De la idea al producto: métricas que importan', 'Auditorio Sabana', [4]],
      ['2026-11-13', '09:30', '10:30', 'charla', 'Enseñar arquitectura con proyectos reales', 'Sala Nube', [5]],
      ['2026-11-13', '10:30', '11:00', 'break', 'Café', 'Zona de stands', []],
      ['2026-11-13', '11:00', '12:30', 'taller', 'Taller: modelado de amenazas en equipo', 'Laboratorio 1', [3]],
      ['2026-11-13', '12:30', '13:45', 'break', 'Almuerzo', 'Terraza', []],
      ['2026-11-13', '13:45', '15:00', 'charla', 'Row Level Security: aislamiento de datos en Postgres', 'Auditorio Sabana', [0, 1]],
      ['2026-11-13', '15:00', '16:00', 'plenaria', 'Cierre y premiación hackathon', 'Auditorio Sabana', [4, 5]],
    ],
    asistentes: [
      { nombres: 'Camilo', apellidos: 'Torres Ríos', tipo_documento: 'CC', numero_documento: 'FER-B-001', email: 'asistente.software@nexvio.dev', cargo: 'Desarrollador backend', empresa: 'Kolibri Apps', tipo_suscripcion: 'Profesional' },
      { nombres: 'Mariana', apellidos: 'López Peña', tipo_documento: 'CC', numero_documento: 'FER-B-002', email: 'asistente2.software@nexvio.dev', cargo: 'Ingeniera de datos', empresa: 'DataAndes', tipo_suscripcion: 'Profesional' },
      { nombres: 'Andrés', apellidos: 'Cárdenas Gil', tipo_documento: 'CC', numero_documento: 'FER-B-003', cargo: 'Estudiante', empresa: 'Universidad El Bosque', tipo_suscripcion: 'Estudiante' },
      { nombres: 'Natalia', apellidos: 'Suárez Díaz', tipo_documento: 'CC', numero_documento: 'FER-B-004', cargo: 'QA Lead', empresa: 'Cumbre Cloud', tipo_suscripcion: 'Profesional' },
      { nombres: 'Sebastián', apellidos: 'Ramírez Ortiz', tipo_documento: 'CC', numero_documento: 'FER-B-005', cargo: 'Estudiante', empresa: 'Universidad Nacional', tipo_suscripcion: 'Estudiante' },
      { nombres: 'Gabriela', apellidos: 'Moreno Silva', tipo_documento: 'PA', numero_documento: 'FER-B-006', cargo: 'CTO', empresa: 'Startup Andina', tipo_suscripcion: 'VIP', pais: 'Ecuador', pais_codigo: 'EC' },
    ],
  },

  // ------------------------------------------------------------------ ORG C
  {
    org: {
      nombre: 'Red Latinoamericana de Educación Digital',
      slug: 'red-educacion-digital',
      organizador: { email: 'org.educacion@nexvio.dev', password: CLAVE_ORGANIZADOR, nombre: 'Jorge Patiño' },
    },
    congreso: {
      nombre: 'EduInnova Medellín 2026',
      fecha_inicio: '2026-12-03',
      fecha_fin: '2026-12-04',
      estado: 'publicado',
      descripcion: 'Docentes e instituciones compartiendo experiencias de innovación educativa con tecnología.',
      ciudad: 'Medellín',
      pais: 'Colombia',
      pais_codigo: 'CO',
      lugar: 'Centro de Convenciones del Valle de Aburrá',
    },
    ponentes: [
      { nombre: 'Elena Quintero', cargo: 'Directora de innovación educativa', empresa: 'Colegio Horizonte', pais: 'Colombia', pais_codigo: 'CO', bio: 'Transformación digital en educación básica.' },
      { nombre: 'Tomás Becerra', cargo: 'Investigador en aprendizaje', empresa: 'Universidad de los Lagos', pais: 'Chile', pais_codigo: 'CL', bio: 'Analítica del aprendizaje y evaluación formativa.' },
      { nombre: 'Renata Aguilar', cargo: 'Diseñadora instruccional', empresa: 'Aula Abierta', pais: 'México', pais_codigo: 'MX', bio: 'Cursos virtuales centrados en el estudiante.' },
      { nombre: 'Hugo Medina', cargo: 'Docente de programación', empresa: 'Escuela Código Joven', pais: 'Colombia', pais_codigo: 'CO', bio: 'Enseña a programar a niños y adolescentes.' },
      { nombre: 'Inés Valverde', cargo: 'Consultora en EdTech', empresa: 'Educa Futuro', pais: 'España', pais_codigo: 'ES', bio: 'Políticas públicas y tecnología educativa.' },
      { nombre: 'Óscar Lima', cargo: 'Rector', empresa: 'Instituto Técnico del Sur', pais: 'Perú', pais_codigo: 'PE', bio: 'Educación técnica conectada con la industria.' },
    ],
    agenda: [
      ['2026-12-03', '08:00', '08:45', 'break', 'Registro y café', 'Lobby', []],
      ['2026-12-03', '08:45', '09:45', 'plenaria', 'Apertura: educar en la era digital', 'Auditorio Aburrá', [0]],
      ['2026-12-03', '09:45', '10:45', 'charla', 'Analítica del aprendizaje para docentes', 'Sala 1', [1]],
      ['2026-12-03', '10:45', '11:15', 'break', 'Café', 'Patio central', []],
      ['2026-12-03', '11:15', '12:15', 'charla', 'Diseño de cursos virtuales que enganchan', 'Sala 2', [2]],
      ['2026-12-03', '12:15', '13:30', 'break', 'Almuerzo', 'Restaurante', []],
      ['2026-12-03', '13:30', '15:00', 'taller', 'Taller: enseñar programación a adolescentes', 'Laboratorio', [3]],
      ['2026-12-03', '15:00', '16:00', 'charla', 'Políticas públicas y EdTech en Iberoamérica', 'Auditorio Aburrá', [4]],
      ['2026-12-04', '08:30', '09:30', 'charla', 'Educación técnica conectada con la industria', 'Auditorio Aburrá', [5]],
      ['2026-12-04', '09:30', '10:30', 'charla', 'Evaluación formativa con herramientas digitales', 'Sala 1', [1, 2]],
      ['2026-12-04', '10:30', '11:00', 'break', 'Café', 'Patio central', []],
      ['2026-12-04', '11:00', '12:30', 'taller', 'Taller: inteligencia artificial en el aula', 'Laboratorio', [0, 3]],
      ['2026-12-04', '12:30', '13:45', 'break', 'Almuerzo', 'Restaurante', []],
      ['2026-12-04', '13:45', '15:00', 'plenaria', 'Panel de rectores y cierre', 'Auditorio Aburrá', [5, 0, 4]],
    ],
    asistentes: [
      { nombres: 'Carolina', apellidos: 'Herrera Paz', tipo_documento: 'CC', numero_documento: 'FER-C-001', email: 'asistente.educacion@nexvio.dev', cargo: 'Docente de matemáticas', empresa: 'Colegio Horizonte', tipo_suscripcion: 'Docente' },
      { nombres: 'Felipe', apellidos: 'Ospina Lara', tipo_documento: 'CC', numero_documento: 'FER-C-002', cargo: 'Coordinador académico', empresa: 'Instituto Técnico del Sur', tipo_suscripcion: 'Docente' },
      { nombres: 'Laura', apellidos: 'Cifuentes Mejía', tipo_documento: 'CC', numero_documento: 'FER-C-003', cargo: 'Estudiante de licenciatura', empresa: 'Universidad de Antioquia', tipo_suscripcion: 'Estudiante' },
      { nombres: 'Manuel', apellidos: 'Duarte Rincón', tipo_documento: 'CC', numero_documento: 'FER-C-004', cargo: 'Rector', empresa: 'Colegio San Lucas', tipo_suscripcion: 'Institucional' },
      { nombres: 'Ana María', apellidos: 'Velásquez Toro', tipo_documento: 'CC', numero_documento: 'FER-C-005', cargo: 'Diseñadora instruccional', empresa: 'Aula Abierta', tipo_suscripcion: 'Docente' },
    ],
  },
];

// --------------------------------------------------------------------------
// El proceso
// --------------------------------------------------------------------------

/** Devuelve el id de la organización del bloque (la busca o la crea). */
async function resolverOrganizacion(token, bloque, organizaciones) {
  if (bloque.existente) {
    const org = SLUG_ORG_A
      ? organizaciones.find((o) => o.slug === SLUG_ORG_A)
      : organizaciones.find((o) => /medic/i.test(o.nombre));
    if (!org) {
      console.error('No encontré la Org A. Organizaciones disponibles:');
      organizaciones.forEach((o) => console.error(`   - ${o.nombre}  (slug: ${o.slug})`));
      throw new Error('Pasa el slug de la Org A como tercer argumento.');
    }
    console.log(`\n🏥 ${org.nombre} (ya existía)`);
    return org.id;
  }

  const ya = organizaciones.find((o) => o.slug === bloque.org.slug);
  if (ya) {
    console.log(`\n🏢 ${ya.nombre} (ya existía)`);
    return ya.id;
  }
  // POST /organizaciones devuelve { organizacion, organizador }.
  const creada = await api(token, 'POST', '/organizaciones', bloque.org);
  console.log(`\n🏢 ${bloque.org.nombre} — creada`);
  return creada.organizacion?.id ?? creada.id;
}

/** Congreso + ponentes + agenda + asistentes de un bloque. */
async function sembrarCongreso(token, orgId, bloque) {
  // 1) El congreso (se busca por nombre dentro de la organización).
  const congresos = await api(token, 'GET', '/congresos', null, orgId);
  let congreso = congresos.find((c) => c.nombre === bloque.congreso.nombre);
  if (!congreso) {
    congreso = await api(token, 'POST', '/congresos', bloque.congreso, orgId);
    console.log(`   📅 Congreso "${congreso.nombre}" — creado`);
  } else {
    console.log(`   📅 Congreso "${congreso.nombre}" (ya existía)`);
  }

  // 2) Ponentes + agenda, solo si aún no tiene agenda (para no duplicar).
  const detalle = await api(token, 'GET', `/congresos/${congreso.id}`, null, orgId);
  if (detalle.sesiones.length > 0) {
    console.log(`   🗓️  Ya tiene ${detalle.sesiones.length} sesiones: no se toca la agenda`);
  } else {
    const ponentes = [];
    for (const [i, p] of bloque.ponentes.entries()) {
      ponentes.push(
        await api(token, 'POST', `/congresos/${congreso.id}/ponentes`, { ...p, orden: i }, orgId),
      );
    }
    for (const [i, [dia, ini, fin, tipo, titulo, sala, idx]] of bloque.agenda.entries()) {
      const sesion = await api(token, 'POST', `/congresos/${congreso.id}/sesiones`, {
        titulo,
        tipo,
        sala,
        inicio: `${dia}T${ini}:00-05:00`,
        fin: `${dia}T${fin}:00-05:00`,
        orden: i,
      }, orgId);
      for (const k of idx) {
        await api(token, 'POST', `/sesiones/${sesion.id}/ponentes/${ponentes[k].id}`, null, orgId);
      }
    }
    console.log(`   🗓️  Agenda: ${bloque.agenda.length} bloques · ${ponentes.length} ponentes`);
  }

  // 3) Asistentes. Si ya existen, el backend responde 409 y se saltan.
  let nuevos = 0;
  for (const a of bloque.asistentes) {
    try {
      await api(token, 'POST', `/congresos/${congreso.id}/asistentes`, a, orgId);
      nuevos++;
    } catch (e) {
      if (e.status !== 409) throw e;
    }
    // Los que tienen correo son los que usaremos para entrar a la app:
    // les dejamos una contraseña conocida.
    if (a.email) await fijarPassword(a.email, CLAVE_ASISTENTE);
  }
  console.log(`   👥 Asistentes: ${nuevos} nuevos de ${bloque.asistentes.length}`);
}

(async () => {
  const token = await login(ADMIN_EMAIL, ADMIN_PASS);
  const organizaciones = await api(token, 'GET', '/superadmin/organizaciones');

  for (const bloque of DATOS) {
    const orgId = await resolverOrganizacion(token, bloque, organizaciones);
    await sembrarCongreso(token, orgId, bloque);
  }

  console.log(`
✅ Listo. Cuentas para la demo:

   PANEL WEB (organizadores, clave ${CLAVE_ORGANIZADOR})
     - org.software@nexvio.dev   → solo ve TechConf Bogotá
     - org.educacion@nexvio.dev  → solo ve EduInnova Medellín

   APP MÓVIL (asistentes, clave ${CLAVE_ASISTENTE})
     - test.asistente@nexvio.dev        → Org A (Medicina)
     - asistente.software@nexvio.dev    → Org B (TechConf)
     - asistente2.software@nexvio.dev   → Org B (para probar el chat)
     - asistente.educacion@nexvio.dev   → Org C (EduInnova)
`);
})().catch((e) => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
