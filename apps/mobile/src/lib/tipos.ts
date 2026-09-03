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
