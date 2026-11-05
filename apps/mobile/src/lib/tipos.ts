export type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  // Datos del evento (Bloque 8.1). Opcionales: congresos viejos no los tienen.
  descripcion?: string | null;
  ciudad?: string | null;
  lugar?: string | null;
};

export type Ponente = {
  id: string;
  nombre: string;
  bio?: string | null;
  foto_url?: string | null;
  // Ficha del speaker (Bloque 8.1)
  cargo?: string | null;
  empresa?: string | null;
  pais?: string | null;
  pais_codigo?: string | null;
};

export type Sesion = {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  sala?: string | null;
  tipo?: string; // charla | break | taller | plenaria
  descripcion?: string | null;
  // El detalle del congreso trae los ponentes de cada sesión (tabla intermedia).
  ponentes?: { ponente: Ponente }[];
  sponsors?: { sponsor: SponsorCharla }[]; // 8.7.f: "Patrocinada por…" (uno o varios, en su orden)
};

/** El sponsor de una charla (8.7.f). */
export type SponsorCharla = { id: string; nombre: string; logo_url: string | null; sitio_web: string | null; nivel: string };

// --- Bloque 8.5: sponsors y marca del congreso ---
export type Sponsor = {
  id: string;
  nombre: string;
  logo_url: string | null;
  sitio_web: string | null;
  nivel: string; // oro | plata | bronce | general (ya vienen ordenados así)
};

export type Personalizacion = {
  logo_url: string | null;
  imagen_portada_url: string | null;
  color_primario: string | null;
  color_secundario: string | null;
  tema_default?: string; // 8.7.g: sistema | claro | oscuro
};

export type CongresoDetalle = Congreso & {
  sesiones: Sesion[];
  ponentes: Ponente[];
  sponsors: Sponsor[];
  personalizacion: Personalizacion | null;
};

export type Inscripcion = {
  id: string;
  estado: string;
  registrado_en: string;
  congreso: Congreso;
};

// --- Fase 5: participacion en vivo ---
export type Pregunta = {
  id: string;
  texto: string;
  estado: string;
  creado_en: string;
  usuario?: { nombre: string };
};

export type OpcionResultado = { id: string; texto: string; votos: number };

export type EncuestaResultado = {
  id: string;
  pregunta: string;
  activa: boolean;
  opciones: OpcionResultado[];
  total: number;
  miVoto: string | null;
};

// --- Fase 6: networking y chat ---
export type DirectorioItem = {
  usuario: { id: string; nombre: string };
  estado: string; // ninguno | enviado | recibido | correspondido
  conexionId: string | null;
};

export type MensajeChat = {
  id: string;
  texto: string;
  autor: { id: string; nombre: string };
  enviado_en: string;
};

export type MensajesResp = {
  limite_mensajes: number;
  usados: number;
  mensajes: MensajeChat[];
};

// --- Bloque 8.6: la bandeja "Avisos" ---
export type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string;
  enviado_en: string;
  sesion: { id: string; titulo: string } | null;
};

/** Lo que devuelve GET /auth/yo (8.7.a: el "portón" del primer ingreso). */
export type Yo = {
  id: string;
  username: string | null;
  nombre: string;
  apellidos: string | null;
  rol: string;
  email: string;
  organizacion_id: string | null;
  debe_cambiar_password: boolean;
  acepto_datos_en: string | null;
  politica_datos_version: string | null;
  requiere_aceptar_datos: boolean;
};

/** La política de datos vigente (GET /auth/politica-datos, Ley 1581). */
export type PoliticaDatos = {
  version: string;
  vigente_desde?: string; // 8.7.c
  url_politica?: string | null; // 8.7.c: la política completa de la organización
  responsable: string;
  resumen: string[];
  secciones: { titulo: string; parrafos: string[] }[];
};

/** GET /perfil (8.7.c): el perfil propio. El documento llega enmascarado. */
export type Perfil = {
  id: string;
  username: string | null;
  nombre: string;
  apellidos: string | null;
  rol: string;
  tipo_documento: string | null;
  numero_documento: string | null; // "••••4050"
  cargo: string | null;
  empresa: string | null;
  telefono: string | null;
  pais: string | null;
  pais_codigo: string | null;
  foto_url: string | null;
  descripcion: string | null; // 8.7.c: "sobre ti"
  anio_nacimiento: number | null; // 8.7.c: solo el año (se muestra la edad)
  visible_networking: boolean; // 8.7.d: "Aparecer en networking"
  compartir_contacto: boolean; // 8.7.d: contacto para las conexiones (el principal)
  compartir_telefono: boolean; // ...y dato por dato
  compartir_correo: boolean;
  compartir_linkedin: boolean;
  contacto_email: string | null;
  linkedin_url: string | null;
  /** Qué campos puede cambiar la persona (los decide el backend). */
  editables: string[];
};

/** Una solicitud del titular sobre sus datos (8.7.c; hoy: supresión). */
export type SolicitudDatos = {
  id: string;
  tipo: string;
  motivo: string | null;
  estado: 'pendiente' | 'atendida' | 'rechazada';
  respuesta: string | null;
  creado_en: string;
  atendida_en: string | null;
};

// ---------------------------------------------------------------------------
// 8.7.d — Networking "tipo Tinder"
// ---------------------------------------------------------------------------

export type CharlaCorta = { id: string; titulo: string; inicio: string; fin: string };

/** Una persona del networking (GET …/networking/personas). */
export type TarjetaPersona = {
  id: string;
  nombre: string;
  foto_url: string | null;
  cargo: string | null;
  empresa: string | null;
  pais: string | null;
  pais_codigo: string | null;
  descripcion: string | null;
  edad: number | null; // la calcula el backend: nunca llega el año
  insignia: 'ponente' | 'organizacion' | 'coordinador' | null;
  charlas: CharlaCorta[];
  /** Mi relación con ella (no viene en "mi-tarjeta"). */
  estado?: 'ninguno' | 'enviado' | 'recibido' | 'correspondido' | 'descartado';
  conexionId?: string | null;
  visible_networking?: boolean; // solo en "mi-tarjeta"
};

/** Un speaker del congreso (Explorar → Ponentes), tenga o no cuenta. */
export type PonenteRed = {
  id: string;
  nombre: string;
  foto_url: string | null;
  cargo: string | null;
  empresa: string | null;
  pais: string | null;
  pais_codigo: string | null;
  bio: string | null;
  usuario_id: string | null;
  charlas: CharlaCorta[];
};

/** Una conexión (match) con la otra persona. */
export type ConexionRed = {
  id: string;
  con: { id: string; nombre: string; apellidos: string | null; foto_url: string | null; cargo: string | null };
  limite_mensajes: number;
  mensajes: number;
};

/** Lo que desbloquea un match (GET /conexiones/:id/contacto). */
export type ContactoConexion = {
  conectados_desde: string;
  mensajes: number;
  limite_mensajes: number;
  compartido: boolean;
  telefono?: string | null;
  correo?: string | null;
  linkedin?: string | null;
};
