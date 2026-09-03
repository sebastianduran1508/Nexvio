export type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
};

export type Ponente = {
  id: string;
  nombre: string;
  bio?: string | null;
  foto_url?: string | null;
};

export type Sesion = {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  sala?: string | null;
};

export type CongresoDetalle = Congreso & {
  sesiones: Sesion[];
  ponentes: Ponente[];
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
