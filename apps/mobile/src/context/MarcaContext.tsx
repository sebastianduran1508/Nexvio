import React, { createContext, useContext, useMemo, useState } from 'react';
import { useTema } from '../tema/tema';
import {
  PRIMARIO_NEXVIO,
  SECUNDARIO_NEXVIO,
  conAlfa,
  legibleSobre,
  oscurecer,
  textoSobre,
} from '../lib/color';

/** Lo que guarda el panel en "Apariencia" (personalizacion_congreso). */
export type DatosMarca = {
  congresoId: string;
  color_primario: string | null;
  color_secundario: string | null;
  logo_url: string | null;
  imagen_portada_url: string | null;
};

type Ctx = { datos: DatosMarca | null; setDatos: (d: DatosMarca | null) => void };
const MarcaCtx = createContext<Ctx>({ datos: null, setDatos: () => {} });

/**
 * LA MARCA DEL CONGRESO ABIERTO (Bloque 8.5.e).
 *
 * El problema: las pantallas de Sesión, Networking y Chat solo reciben un id
 * por la navegación; no saben de qué congreso son ni qué colores tiene. En vez
 * de pasar los colores de pantalla en pantalla, el DETALLE del congreso los
 * guarda aquí al cargar, y las pantallas hijas los leen con useMarca().
 *
 * Es el mismo patrón que AuthContext: una memoria compartida.
 */
export function MarcaProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosMarca | null>(null);
  return <MarcaCtx.Provider value={{ datos, setDatos }}>{children}</MarcaCtx.Provider>;
}

/** Para el detalle del congreso: guardar la marca del congreso que se abrió. */
export function useFijarMarca() {
  return useContext(MarcaCtx).setDatos;
}

/**
 * Los colores listos para pintar, ya adaptados al modo claro u oscuro.
 * Si el congreso no personalizó nada, devuelve los de Nexvio (idénticos a tema.ts).
 */
export function useMarca() {
  const { datos } = useContext(MarcaCtx);
  const t = useTema();

  return useMemo(() => {
    const propio = datos?.color_primario ?? null;
    const primario = propio ?? PRIMARIO_NEXVIO;
    const acento = datos?.color_secundario ?? SECUNDARIO_NEXVIO;
    return {
      /** Rellenos: botones, pestaña de día activa, barras. */
      primario,
      /** Degradado de la cabecera: el principal hacia uno 30 % más oscuro. */
      degradado: [primario, propio ? oscurecer(primario, 0.3) : '#7C3AED'] as const,
      /** Textos e íconos con el color de marca, legibles sobre el fondo actual. */
      primarioTexto: propio ? legibleSobre(primario, t.tarjeta) : t.primarioTexto,
      /** Fondos suaves con el color de marca. */
      primarioSuave: propio ? conAlfa(primario, t.oscuro ? 0.2 : 0.1) : t.primarioSuave,
      /** Acento ("EN CURSO", lo que está en vivo) y el texto que va encima. */
      acento,
      textoAcento: textoSobre(acento),
      logo: datos?.logo_url ?? null,
      portada: datos?.imagen_portada_url ?? null,
    };
  }, [datos, t]);
}
