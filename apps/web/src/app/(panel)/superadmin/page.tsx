'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, Globe2, Radio, Search, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePanel } from '@/components/panel/panel-contexto';
import { EncabezadoPagina, EsqueletoPagina } from '@/components/panel/encabezado-pagina';
import { TarjetaCongreso, rangoCorto } from '@/components/panel/tarjeta-congreso';
import { cn } from '@/lib/utils';

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

type Filtro = 'todos' | 'publicado' | 'borrador';

/**
 * PANORAMA — la vista que pidió el cliente: todos los congresos de todos los
 * clientes a la vez, con los que están en curso de primeros.
 *
 * Es una de las DOS únicas vistas de la app que cruzan organizaciones, y por
 * eso no sale de una consulta normal sino de la función acotada
 * `nexvio_panorama_congresos()`. Es de SOLO LECTURA: para entrar a trabajar en
 * uno, "Entrar" mete al superadmin en ese tenant y a partir de ahí manda el
 * RLS como con cualquier organizador.
 *
 * 8.7.h: indicadores con color, buscador, filtros y tarjetas en cuadrícula.
 */
export default function PanoramaPage() {
  const { cambiarOrg, organizaciones } = usePanel();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');

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
  const hoy = new Date().toISOString().slice(0, 10);
  const proximo = filas
    .filter((f) => !f.en_curso && f.fecha_inicio.slice(0, 10) >= hoy)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0];

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (filtro === 'todos' || f.estado === filtro) &&
        (!q || f.congreso.toLowerCase().includes(q) || f.organizacion.toLowerCase().includes(q)),
    );
  }, [filas, filtro, busqueda]);

  if (cargando) return <EsqueletoPagina />;

  const cuenta = (e: Filtro) => (e === 'todos' ? filas.length : filas.filter((f) => f.estado === e).length);

  return (
    <div className="contenido-panel">
      <EncabezadoPagina
        Icono={Globe2}
        migas={[{ texto: 'Superadmin' }, { texto: 'Panorama' }]}
        titulo="Panorama"
        subtitulo="Todos los congresos de todas las organizaciones."
      />

      {error && <p className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {!error && (
        <>
          <div className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              Icono={Radio}
              tono="coral"
              valor={enCurso.length}
              texto="En curso ahora"
              detalle={
                enCurso.length > 0
                  ? enCurso.map((f) => f.congreso).join(' · ')
                  : proximo
                    ? `Próximo: ${proximo.congreso} · ${rangoCorto(proximo.fecha_inicio)}`
                    : 'Ninguno programado'
              }
            />
            <Indicador Icono={CalendarDays} tono="violeta" valor={filas.length} texto="Congresos" detalle={`${cuenta('publicado')} publicados · ${cuenta('borrador')} borradores`} />
            <Indicador Icono={Users} tono="verde" valor={filas.reduce((n, f) => n + f.total_inscritos, 0)} texto="Inscritos" detalle="En todas las organizaciones" />
            <Indicador Icono={Building2} tono="azul" valor={organizaciones.length} texto="Organizaciones" detalle="Clientes en la plataforma" />
          </div>

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-bold text-foreground">Congresos</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-[240px] items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-muted-foreground focus-within:border-primary/50">
                  <Search className="h-4 w-4" />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar congreso u organización…"
                    aria-label="Buscar congreso u organización"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
                {(['todos', 'publicado', 'borrador'] as Filtro[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFiltro(f)}
                    aria-pressed={filtro === f}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors',
                      filtro === f
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-foreground hover:border-primary/40',
                    )}
                  >
                    {f === 'todos' ? 'Todos' : f === 'publicado' ? 'Publicados' : 'Borradores'} · {cuenta(f)}
                  </button>
                ))}
              </div>
            </div>

            {visibles.length === 0 ? (
              <div className="rounded-[22px] border-2 border-dashed border-primary/20 bg-card/60 p-12 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-primary/60" />
                <p className="mt-3 font-semibold text-foreground">
                  {filas.length === 0 ? 'Todavía no hay congresos en ninguna organización.' : 'Ningún congreso coincide con la búsqueda.'}
                </p>
              </div>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4">
                {visibles.map((f) => (
                  <li key={f.congreso_id}>
                    <TarjetaCongreso
                      id={f.congreso_id}
                      nombre={f.congreso}
                      organizacion={f.organizacion}
                      fechaInicio={f.fecha_inicio}
                      fechaFin={f.fecha_fin}
                      ciudad={f.ciudad}
                      estado={f.estado}
                      enCurso={f.en_curso}
                      sesiones={f.total_sesiones}
                      inscritos={f.total_inscritos}
                      alEntrar={() => cambiarOrg({ id: f.organizacion_id, nombre: f.organizacion }, `/congresos/${f.congreso_id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const TONOS = {
  coral: 'bg-coral/15 text-[#e85a37] dark:text-[#ff9c80]',
  violeta: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-[#a99dff]',
  verde: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  azul: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
} as const;

function Indicador({
  Icono,
  tono,
  valor,
  texto,
  detalle,
}: {
  Icono: React.ComponentType<{ className?: string }>;
  tono: keyof typeof TONOS;
  valor: number;
  texto: string;
  detalle?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-card p-5 shadow-sm">
      <span className={cn('flex h-[42px] w-[42px] items-center justify-center rounded-[13px]', TONOS[tono])}>
        <Icono className="h-5 w-5" />
      </span>
      <p className="font-heading text-[34px] leading-none font-bold text-card-foreground">{valor}</p>
      <p className="text-sm font-semibold text-card-foreground">{texto}</p>
      {detalle && <p className="truncate text-[12.5px] text-muted-foreground" title={detalle}>{detalle}</p>}
    </div>
  );
}
