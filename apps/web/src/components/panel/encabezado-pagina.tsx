import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Icono = React.ComponentType<{ className?: string }>;

/**
 * Chip de ícono que acompaña al título de cada pantalla (8.7.h).
 * Degradado violeta de la marca; `tono="coral"` para las pantallas que
 * mezclan los dos colores (Agenda).
 */
export function ChipTitulo({ Icono, tono = 'violeta' }: { Icono: Icono; tono?: 'violeta' | 'coral' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(90,70,240,0.32)]',
        tono === 'coral'
          ? 'bg-[linear-gradient(135deg,#5a46f0,#ff7a59)]'
          : 'bg-[linear-gradient(135deg,#5a46f0,#7c3aed)]',
      )}
    >
      <Icono className="h-5 w-5" />
    </span>
  );
}

export type Miga = { texto: string; href?: string };

/**
 * Encabezado común de las pantallas del panel (8.7.h):
 *   migas de pan · chip + título · subtítulo · acciones a la derecha.
 * Así todas las pantallas "arrancan" igual y el ojo sabe dónde mirar.
 */
export function EncabezadoPagina({
  Icono,
  tono,
  migas,
  titulo,
  subtitulo,
  acciones,
  className,
}: {
  Icono: Icono;
  tono?: 'violeta' | 'coral';
  migas?: Miga[];
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        <ChipTitulo Icono={Icono} tono={tono} />
        <div className="min-w-0">
          {migas && migas.length > 0 && (
            <nav aria-label="Ruta" className="mb-0.5 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-muted-foreground">
              {migas.map((m, i) => (
                <span key={i} className="flex items-center gap-1">
                  {m.href ? (
                    <Link href={m.href} className="hover:text-primary">
                      {m.texto}
                    </Link>
                  ) : (
                    <span>{m.texto}</span>
                  )}
                  {i < migas.length - 1 && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                </span>
              ))}
            </nav>
          )}
          <h1 className="font-heading text-[1.75rem] leading-tight font-bold tracking-tight text-foreground">{titulo}</h1>
          {subtitulo && <div className="mt-0.5 text-sm text-muted-foreground">{subtitulo}</div>}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

/** 8.7.h: mientras carga, la silueta de una pantalla en vez de "Cargando…". */
export function EsqueletoPagina() {
  return (
    <div className="contenido-panel animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="mb-7 flex items-center gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/15" />
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-muted" />
          <div className="h-6 w-56 rounded bg-primary/10" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-[20px] border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
