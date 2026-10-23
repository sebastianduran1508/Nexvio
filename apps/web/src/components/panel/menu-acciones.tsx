'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Accion = {
  texto: string;
  Icono: React.ComponentType<{ className?: string }>;
  alHacer: () => void;
  /** Pinta la opción en rojo (borrar, quitar…). */
  peligroso?: boolean;
};

/**
 * El menú de los tres puntos que aparece al final de cada fila de una tabla.
 *
 * Existe porque meter cuatro botones en cada fila la vuelve ilegible: con
 * decenas de inscritos, la tabla se convierte en un muro de iconos. Un solo
 * punto de entrada mantiene la fila limpia y deja sitio para los datos, que es
 * lo que el admin viene a mirar.
 */
export function MenuAcciones({
  acciones,
  etiqueta = 'Acciones',
}: {
  acciones: Accion[];
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  return (
    <div className="relative inline-block text-left" ref={caja}>
      <button
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={(e) => {
          // La fila entera suele ser clicable; sin esto, abrir el menú también
          // dispararía la acción de la fila.
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
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
        </div>
      )}
    </div>
  );
}
