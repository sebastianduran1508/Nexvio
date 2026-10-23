'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Panel que entra desde la derecha para ver o editar algo sin salir de la
 * lista (lo que se suele llamar *drawer*).
 *
 * Se eligió esto en vez de una página aparte porque el admin casi siempre
 * quiere mirar una ficha y volver: con una página perdería el scroll, el
 * filtro y el sitio donde estaba. Aquí la tabla sigue detrás, intacta.
 */
export function PanelLateral({
  abierto,
  titulo,
  subtitulo,
  alCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  alCerrar: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') alCerrar();
    }
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end bg-black/40"
      onClick={alCerrar}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-card-foreground">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="truncate text-sm text-muted-foreground">{subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={alCerrar}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
