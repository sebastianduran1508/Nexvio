'use client';

import { useEffect, useState } from 'react';
import { Radio, CalendarDays, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePanel } from '@/components/panel/panel-contexto';
import { Button } from '@/components/ui/button';

type Fila = {
  organizacion_id: string;
  organizacion: string;
  congreso_id: string;
  congreso: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  ciudad: string | null;
  en_curso: boolean;
  total_sesiones: number;
  total_inscritos: number;
};

/**
 * PANORAMA — la vista que pidió el cliente: todos los congresos de todos los
 * clientes a la vez, con los que están en curso de primeros.
 *
 * Es una de las DOS únicas vistas de la app que cruzan organizaciones, y por
 * eso no sale de una consulta normal sino de la función acotada
 * `nexvio_panorama_congresos()`. Es de SOLO LECTURA: para entrar a trabajar en
 * uno, el botón "Entrar" mete al superadmin en ese tenant y a partir de ahí
 * manda el RLS como con cualquier organizador.
 */
export default function PanoramaPage() {
  const { cambiarOrg } = usePanel();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setFilas(await apiFetch<Fila[]>('GET', '/superadmin/panorama'));
      } catch (e: any) {
        setError(e.message ?? 'No se pudo cargar el panorama');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const enCurso = filas.filter((f) => f.en_curso);

  return (
    <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
        Panorama
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todos los congresos de todas las organizaciones.
      </p>

      {cargando && <p className="mt-6 text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!cargando && !error && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Tarjeta Icono={Radio} valor={enCurso.length} texto="en curso ahora" destacada />
            <Tarjeta Icono={CalendarDays} valor={filas.length} texto="congresos en total" />
            <Tarjeta
              Icono={Users}
              valor={filas.reduce((n, f) => n + f.total_inscritos, 0)}
              texto="inscritos en total"
            />
          </div>

          {filas.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Todavía no hay congresos en ninguna organización.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {filas.map((f) => (
                <li
                  key={f.congreso_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {f.en_curso && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-medium text-coral">
                          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                          en curso
                        </span>
                      )}
                      <span className="truncate font-medium text-card-foreground">
                        {f.congreso}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f.organizacion} · {rango(f.fecha_inicio, f.fecha_fin)}
                      {f.ciudad ? ` · ${f.ciudad}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.total_sesiones} sesiones · {f.total_inscritos} inscritos ·{' '}
                      {f.estado}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      cambiarOrg(
                        { id: f.organizacion_id, nombre: f.organizacion },
                        '/congresos',
                      )
                    }
                  >
                    Entrar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Tarjeta({
  Icono,
  valor,
  texto,
  destacada,
}: {
  Icono: React.ComponentType<{ className?: string }>;
  valor: number;
  texto: string;
  destacada?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Icono className={destacada ? 'h-5 w-5 text-coral' : 'h-5 w-5 text-primary'} />
      <p className="mt-2 text-2xl font-semibold text-card-foreground">{valor}</p>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function rango(inicio: string, fin: string) {
  const f = (s: string) =>
    new Date(s).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return `${f(inicio)} — ${f(fin)}`;
}
