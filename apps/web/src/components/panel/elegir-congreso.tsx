'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Congreso = { id: string; nombre: string; estado?: string };

/**
 * "¿En qué congreso quieres trabajar?" — la puerta de entrada de las secciones
 * del menú que viven DENTRO de un congreso (Usuarios, Agenda, Speakers...).
 *
 * Nació en el 8.3 dentro de /usuarios y en el 8.4 se volvió componente, porque
 * Agenda y Speakers necesitan exactamente lo mismo: los datos son por congreso,
 * así que primero hay que elegir uno. Si la organización tiene un solo
 * congreso, entra directo sin preguntar.
 *
 * `seccion` es el final de la ruta: 'speakers' lleva a /congresos/:id/speakers.
 */
export function ElegirCongreso({
  titulo,
  descripcion,
  seccion,
}: {
  titulo: string;
  descripcion: string;
  seccion: string;
}) {
  const router = useRouter();
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const lista = await apiFetch<Congreso[]>('GET', '/congresos');
        if (lista.length === 1) {
          router.replace(`/congresos/${lista[0].id}/${seccion}`);
          return;
        }
        setCongresos(lista);
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar los congresos');
      } finally {
        setCargando(false);
      }
    })();
  }, [router, seccion]);

  return (
    <div className="mx-auto w-full max-w-3xl p-6 md:p-8">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
        {titulo}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>

      {cargando && <p className="mt-6 text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
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
              href={`/congresos/${c.id}/${seccion}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-card-foreground">{c.nombre}</span>
                  {c.estado && <span className="block text-xs text-muted-foreground">{c.estado}</span>}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
