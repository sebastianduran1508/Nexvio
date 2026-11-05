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
        className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/[0.12] px-3.5 py-1.5 text-white transition-colors hover:bg-white/[0.2]"
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <Building2 className="h-[18px] w-[18px] shrink-0" />
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/75">
            Trabajando en
          </span>
          <span className="block max-w-[16rem] truncate text-sm font-bold">
            {orgActual?.nombre ?? 'Elige una organización'}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/80" />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
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
