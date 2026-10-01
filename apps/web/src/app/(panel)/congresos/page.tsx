'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePanel } from '@/components/panel/panel-contexto';
import { buttonVariants } from '@/components/ui/button';

type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  ciudad?: string | null;
};

/**
 * Lista de congresos del tenant ACTIVO.
 *
 * Para un organizador, el tenant es su organización (viene en el token).
 * Para el superadmin, es la que eligió en el selector de la cabecera: apiFetch
 * manda la cabecera X-Organizacion-Id y el backend hace el resto. Fíjate en que
 * esta pantalla NO sabe nada de eso — pide "los congresos" y ya.
 */
export default function CongresosPage() {
  const { esSuperadmin, orgActual } = usePanel();
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCongresos(await apiFetch<Congreso[]>('GET', '/congresos'));
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar los congresos');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
            Congresos
          </h1>
          {esSuperadmin && orgActual && (
            <p className="mt-1 text-sm text-muted-foreground">
              Trabajando en{' '}
              <span className="font-medium text-foreground">{orgActual.nombre}</span>
            </p>
          )}
        </div>
        <Link href="/congresos/nuevo" className={buttonVariants({ size: 'sm' })}>
          <Plus /> Nuevo congreso
        </Link>
      </header>

      {cargando && <p className="text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!cargando && !error && congresos.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Esta organización aún no tiene congresos.
        </p>
      )}

      <ul className="space-y-3">
        {congresos.map((c) => (
          <li key={c.id}>
            <Link
              href={`/congresos/${c.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-card-foreground">{c.nombre}</span>
                {c.estado && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {c.estado}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatearRango(c.fecha_inicio, c.fecha_fin)}
                {c.ciudad ? ` · ${c.ciudad}` : ''}
              </p>
              <span className="mt-2 block text-sm text-primary">Abrir ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "10 nov 2026 — 12 nov 2026" (las fechas llegan en ISO desde la API). */
function formatearRango(inicio?: string, fin?: string) {
  if (!inicio || !fin) return '';
  const f = (s: string) =>
    new Date(s).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return `${f(inicio)} — ${f(fin)}`;
}
