'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Congreso = { id: string; nombre: string; fecha_inicio?: string; estado?: string };

/**
 * "Usuarios" del menú lateral.
 *
 * Los asistentes se gestionan POR CONGRESO (la inscripción y el tipo de
 * suscripción son de cada evento), así que esta pantalla solo pregunta en cuál
 * quieres trabajar y te manda allí. Si la organización tiene un solo congreso,
 * entra directo sin hacerte elegir entre una única opción.
 */
export default function UsuariosPage() {
  const router = useRouter();
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const lista = await apiFetch<Congreso[]>('GET', '/congresos');
        if (lista.length === 1) {
          router.replace(`/congresos/${lista[0].id}/asistentes`);
          return;
        }
        setCongresos(lista);
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar los congresos');
      } finally {
        setCargando(false);
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-3xl p-6 md:p-8">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
        Usuarios
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige el congreso cuyos asistentes quieres gestionar.
      </p>

      {cargando && <p className="mt-6 text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!cargando && !error && congresos.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Esta organización todavía no tiene congresos.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {congresos.map((c) => (
          <li key={c.id}>
            <Link
              href={`/congresos/${c.id}/asistentes`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-card-foreground">
                    {c.nombre}
                  </span>
                  {c.estado && (
                    <span className="block text-xs text-muted-foreground">{c.estado}</span>
                  )}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm text-primary">
                <Users className="h-4 w-4" /> Asistentes ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
