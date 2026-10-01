/**
 * Ciudades sugeridas por país, para normalizar igual que con los países.
 *
 * No pretende ser un catálogo mundial: trae las ciudades donde realmente se
 * hacen congresos en los países más probables del cliente. Para cualquier país
 * sin lista (o una ciudad que no esté), el selector permite escribirla a mano
 * — con la lista se cubre el 95% de los casos y el 5% restante no se bloquea.
 */
export const CIUDADES_POR_PAIS: Record<string, string[]> = {
  CO: [
    'Armenia', 'Barranquilla', 'Bogotá', 'Bucaramanga', 'Cali', 'Cartagena',
    'Cúcuta', 'Ibagué', 'Manizales', 'Medellín', 'Montería', 'Neiva',
    'Pasto', 'Pereira', 'Popayán', 'Riohacha', 'Santa Marta', 'Sincelejo',
    'Tunja', 'Valledupar', 'Villavicencio',
  ],
  MX: [
    'Ciudad de México', 'Guadalajara', 'Monterrey', 'Cancún', 'Puebla',
    'Querétaro', 'Mérida', 'Tijuana', 'León',
  ],
  AR: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Mar del Plata'],
  CL: ['Santiago', 'Valparaíso', 'Viña del Mar', 'Concepción'],
  PE: ['Lima', 'Arequipa', 'Cusco', 'Trujillo'],
  EC: ['Quito', 'Guayaquil', 'Cuenca'],
  BR: ['São Paulo', 'Río de Janeiro', 'Brasilia', 'Belo Horizonte', 'Salvador'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga'],
  US: ['Nueva York', 'Miami', 'Chicago', 'Los Ángeles', 'Boston', 'Orlando'],
  PA: ['Ciudad de Panamá'],
  CR: ['San José'],
  UY: ['Montevideo'],
  PY: ['Asunción'],
  BO: ['La Paz', 'Santa Cruz de la Sierra', 'Cochabamba'],
  VE: ['Caracas', 'Maracaibo', 'Valencia'],
};

/** Ciudades sugeridas para un país (vacío si no tenemos lista para él). */
export function ciudadesDe(codigoPais?: string): string[] {
  if (!codigoPais) return [];
  return CIUDADES_POR_PAIS[codigoPais] ?? [];
}
