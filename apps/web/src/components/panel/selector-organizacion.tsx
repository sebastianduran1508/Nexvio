'use client';

import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePanel } from './panel-contexto';
import { cn } from '@/lib/utils';

/**
 * Selector de organización — SOLO para el superadmin.
 *
 * Es la cara visible de la "suplantación de tenant": al elegir una
 * organización, su id se guarda y viaja en la cabecera X-Organizacion-Id de
 * cada petición. A partir de ahí el superadmin trabaja DENTRO de ese cliente,
 * con los mismos permisos que un organizador y pasando por el mismo RLS.
 */
export function SelectorOrganizacion() {
  const { esSuperadmin, organizaciones, orgActual, cambiarOrg } = usePanel();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  if (!esSuperadmin) return null;

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-1.5 transition-colors hover:border-primary/60 hover:bg-primary/10"
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Trabajando en
          </span>
          <span className="block max-w-[16rem] truncate text-sm font-semibold text-foreground">
            {orgActual?.nombre ?? 'Elige una organización'}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute left-1/2 z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <p className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trabajar como
          </p>
          <ul className="max-h-80 overflow-y-auto py-1">
            {organizaciones.map((o) => {
              const activa = o.id === orgActual?.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={activa}
                    onClick={() => {
                      setAbierto(false);
                      if (!activa) cambiarOrg({ id: o.id, nombre: o.nombre });
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                      activa && 'bg-muted',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-card-foreground">
                        {o.nombre}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {o.total_congresos}{' '}
                        {o.total_congresos === 1 ? 'congreso' : 'congresos'}
                      </span>
                    </span>
                    {activa && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
            {organizaciones.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                Aún no hay organizaciones.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
