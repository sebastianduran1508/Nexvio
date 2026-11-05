'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Accion = {
  texto: string;
  Icono: React.ComponentType<{ className?: string }>;
  alHacer: () => void;
  /** Pinta la opción en rojo (borrar, quitar…). */
  peligroso?: boolean;
};

const ANCHO_MENU = 224; // w-56

/**
 * El menú de los tres puntos que aparece al final de cada fila de una tabla.
 *
 * Existe porque meter cuatro botones en cada fila la vuelve ilegible: con
 * decenas de inscritos, la tabla se convierte en un muro de iconos. Un solo
 * punto de entrada mantiene la fila limpia y deja sitio para los datos, que es
 * lo que el admin viene a mirar.
 *
 * 8.7.f — se dibuja en un PORTAL (directo en <body>, con posición fija junto
 * al botón). Antes vivía dentro de la tarjeta, y una tarjeta con
 * `overflow-hidden` (la de la agenda) lo recortaba. Ahora ningún contenedor
 * puede taparlo, y si no cabe hacia abajo se abre hacia ARRIBA.
 */
export function MenuAcciones({
  acciones,
  etiqueta = 'Acciones',
}: {
  acciones: Accion[];
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Dónde ponerlo: debajo del botón, alineado a su derecha; si no cabe abajo,
  // encima. useLayoutEffect: se calcula ANTES de pintar (sin "saltos").
  useLayoutEffect(() => {
    if (!abierto || !boton.current) return;
    const r = boton.current.getBoundingClientRect();
    const alto = menu.current?.offsetHeight ?? acciones.length * 38 + 8;
    const cabeAbajo = r.bottom + 4 + alto <= window.innerHeight - 8;
    setPos({
      top: cabeAbajo ? r.bottom + 4 : Math.max(8, r.top - 4 - alto),
      left: Math.max(8, Math.min(r.right - ANCHO_MENU, window.innerWidth - ANCHO_MENU - 8)),
    });
  }, [abierto, acciones.length]);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      const t = e.target as Node;
      if (!boton.current?.contains(t) && !menu.current?.contains(t)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    // Si la página se desplaza o cambia de tamaño, el botón se mueve: cerramos.
    const cerrar = () => setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  return (
    <div className="inline-block text-left">
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={(e) => {
          // La fila entera suele ser clicable; sin esto, abrir el menú también
          // dispararía la acción de la fila.
          e.stopPropagation();
          setPos(null);
          setAbierto((v) => !v);
        }}
        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            // Mientras se calcula la posición (un instante), invisible.
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
            className="fixed z-[90] w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {acciones.map(({ texto, Icono, alHacer, peligroso }) => (
              <button
                key={texto}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbierto(false);
                  alHacer();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  peligroso ? 'text-destructive' : 'text-card-foreground',
                )}
              >
                <Icono className="h-4 w-4" />
                {texto}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
