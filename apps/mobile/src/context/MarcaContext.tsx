import React, { createContext, useContext, useMemo, useState } from 'react';
import { DEGRADADO, useTema, type Degradado } from '../tema/tema';
import {
  PRIMARIO_NEXVIO,
  SECUNDARIO_NEXVIO,
  aclarar,
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
  /** 8.7.g: el tema por defecto que eligió el organizador. */
  tema_default?: 'sistema' | 'claro' | 'oscuro' | string | null;
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
      /**
       * Degradado de la cabecera y de la barra de pestañas (8.7.j): de una
       * versión profunda del color principal hasta el principal. Con los
       * colores de Nexvio es exactamente el del panel.
       */
      degradado: (propio
        ? [oscurecer(primario, 0.5), oscurecer(primario, 0.2), primario]
        : DEGRADADO) as Degradado,
      /**
       * 8.7.j: el brillo de la esquina. Con Nexvio, el coral (como el panel).
       * Con colores propios, una versión CLARA DEL MISMO principal — no el
       * secundario: el brillo es semitransparente y se MEZCLA con el fondo, y
       * dos colores opuestos (naranja + verde azulado) dan un tono barroso.
       * Bug visto al probar el 8.7.j (6-nov).
       */
      brillo: propio ? aclarar(primario, 0.45) : SECUNDARIO_NEXVIO,
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

/** 8.7.g: el tema por defecto del congreso abierto (o null si no hay congreso). */
export function useTemaCongreso(): 'sistema' | 'claro' | 'oscuro' | null {
  const { datos } = useContext(MarcaCtx);
  const t = datos?.tema_default;
  return t === 'claro' || t === 'oscuro' || t === 'sistema' ? t : null;
}
