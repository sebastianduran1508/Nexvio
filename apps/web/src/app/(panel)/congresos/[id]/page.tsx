'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

type Sesion = { id: string; titulo: string; inicio: string; fin: string; sala?: string | null };
type CongresoDetalle = { id: string; nombre: string; sesiones: Sesion[] };

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Detalle de un congreso en el panel: sus sesiones. Cada una lleva a la pantalla
 * de moderacion en vivo (preguntas y encuestas).
 */
export default function CongresoDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setDetalle(await apiFetch<CongresoDetalle>('GET', `/congresos/${params.id}`));
      } catch (e: any) {
        if (String(e.message).includes('401')) router.replace('/login');
        else setError('No se pudo cargar el congreso');
      }
    })();
  }, [params.id, router]);

  if (error) return <p className="p-8 text-destructive">{error}</p>;
  if (!detalle) return <p className="p-8 text-muted-foreground">Cargando…</p>;

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <Link href="/congresos" className="text-sm text-primary">
        ‹ Congresos
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
          {detalle.nombre}
        </h1>
        <Link
          href={`/congresos/${detalle.id}/asistentes`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Users /> Asistentes
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-medium text-foreground">Sesiones</h2>
      {detalle.sesiones.length === 0 ? (
        <p className="text-muted-foreground">Este congreso aún no tiene sesiones.</p>
      ) : (
        <ul className="space-y-3">
          {detalle.sesiones.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sesiones/${s.id}`}
                className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:shadow"
              >
                <span className="text-sm text-primary">
                  {hora(s.inicio)} - {hora(s.fin)}
                  {s.sala ? `  ·  ${s.sala}` : ''}
                </span>
                <p className="font-medium text-card-foreground">{s.titulo}</p>
                <span className="mt-1 block text-sm text-primary">Moderar en vivo ›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
