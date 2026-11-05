'use client';

import {
  BarChart3,
  CheckCheck,
  CheckCircle2,
  Clock,
  Handshake,
  MapPin,
  MessageSquare,
  Plus,
  Radio,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import { apiFetch } from '@/lib/api';
import { crearSocket } from '@/lib/socket';
import { Input } from '@/components/ui/input';
import { AvatarPonente } from '@/components/panel/avatar-ponente';
import { EsqueletoPagina } from '@/components/panel/encabezado-pagina';
import { enVivo, horaEnZona } from '@/lib/zona';
import { cn } from '@/lib/utils';

type Pregunta = {
  id: string;
  texto: string;
  estado: string;
  creado_en?: string;
  usuario?: { nombre: string; apellidos?: string | null; foto_url?: string | null };
};
type OpcionResultado = { id: string; texto: string; votos: number };
type Encuesta = {
  id: string;
  pregunta: string;
  activa: boolean;
  opciones: OpcionResultado[];
  total: number;
};
type SesionContexto = {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  sala: string | null;
  tipo: string;
  congreso: {
    id: string;
    nombre: string;
    zona_horaria: string;
    personalizacion: { logo_url: string | null; color_primario: string | null; color_secundario: string | null } | null;
  };
  ponentes: { ponente: { id: string; nombre: string; cargo: string | null; foto_url: string | null } }[];
  sponsors?: { sponsor: { id: string; nombre: string; logo_url: string | null } }[];
  _count?: { favoritas: number };
};

type Filtro = 'pendiente' | 'aprobada' | 'respondida' | 'rechazada' | 'todas';

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'aprobada', texto: 'Aprobadas' },
  { valor: 'respondida', texto: 'Respondidas' },
  { valor: 'rechazada', texto: 'Rechazadas' },
  { valor: 'todas', texto: 'Todas' },
];

/**
 * MODERACIÓN EN VIVO de una sesión (staff).
 *  - Preguntas: ver TODAS y moderarlas (aprobar / rechazar / respondida).
 *  - Encuestas: crear, abrir/cerrar y ver resultados.
 * Se une a la sala de la sesión por Socket.io y refresca al oír los avisos, así
 * lo que hace el asistente en el móvil aparece aquí al instante (y viceversa).
 *
 * 8.7.h: encabezado con la marca del congreso y los datos de la charla,
 * indicadores, filtros de preguntas con conteo y encuestas con el resultado
 * que va ganando resaltado. Ocupa todo el ancho.
 */
export default function SesionModeracionPage() {
  const params = useParams<{ id: string }>();
  const sesionId = params.id;

  const [sesion, setSesion] = useState<SesionContexto | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [conectado, setConectado] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('pendiente');
  const [error, setError] = useState<string | null>(null);

  const cargarPreguntas = useCallback(async () => {
    try {
      setPreguntas(await apiFetch<Pregunta[]>('GET', `/sesiones/${sesionId}/preguntas`));
    } catch {}
  }, [sesionId]);
  const cargarEncuestas = useCallback(async () => {
    try {
      setEncuestas(await apiFetch<Encuesta[]>('GET', `/sesiones/${sesionId}/encuestas`));
    } catch {}
  }, [sesionId]);

  useEffect(() => {
    apiFetch<SesionContexto>('GET', `/sesiones/${sesionId}`)
      .then(setSesion)
      .catch((e) => setError(e.message ?? 'No se pudo cargar la sesión'));
    cargarPreguntas();
    cargarEncuestas();

    let socket: Socket | undefined;
    let activo = true;
    crearSocket().then((s) => {
      if (!activo) return s.disconnect();
      socket = s;
      s.emit('join_sesion', sesionId);
      s.on('preguntas:cambio', cargarPreguntas);
      s.on('encuestas:cambio', cargarEncuestas);
      s.on('connect', () => setConectado(true));
      s.on('disconnect', () => setConectado(false));
      setConectado(s.connected);
    });
    return () => {
      activo = false;
      if (socket) {
        socket.emit('leave_sesion', sesionId);
        socket.disconnect();
      }
    };
  }, [sesionId, cargarPreguntas, cargarEncuestas]);

  async function ejecutar(fn: () => Promise<void>) {
    try {
      setError(null);
      await fn();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo completar la acción');
    }
  }
  const moderar = (id: string, estado: string) =>
    ejecutar(async () => {
      await apiFetch('PATCH', `/preguntas/${id}`, { estado });
      await cargarPreguntas();
    });
  const alternar = (enc: Encuesta) =>
    ejecutar(async () => {
      await apiFetch('PATCH', `/encuestas/${enc.id}`, { activa: !enc.activa });
      await cargarEncuestas();
    });

  const cuenta = useMemo(() => {
    const c: Record<Filtro, number> = { pendiente: 0, aprobada: 0, respondida: 0, rechazada: 0, todas: preguntas.length };
    for (const p of preguntas) if (p.estado in c) c[p.estado as Filtro]++;
    return c;
  }, [preguntas]);
  const visibles = filtro === 'todas' ? preguntas : preguntas.filter((p) => p.estado === filtro);
  const abiertas = encuestas.filter((e) => e.activa).length;

  if (!sesion && !error) return <EsqueletoPagina />;

  const zona = sesion?.congreso.zona_horaria ?? 'America/Bogota';
  const marca = sesion?.congreso.personalizacion;
  const a = marca?.color_primario || '#3b26b5';
  const b = marca?.color_secundario || '#6d3fe6';
  const ahoraVivo = sesion ? enVivo(sesion.inicio, sesion.fin) : false;
  const terminada = sesion ? new Date(sesion.fin) < new Date() : false;

  return (
    <div className="contenido-panel">
      {/* ---------- Encabezado con la marca del congreso ---------- */}
      {sesion && (
        <>
          <nav aria-label="Ruta" className="mb-3 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-muted-foreground">
            <Link href="/congresos" className="hover:text-primary">Congresos</Link>›
            <Link href={`/congresos/${sesion.congreso.id}`} className="hover:text-primary">{sesion.congreso.nombre}</Link>›
            <Link href={`/congresos/${sesion.congreso.id}/agenda`} className="hover:text-primary">Agenda</Link>›
            <span>Moderación en vivo</span>
          </nav>

          <section
            className="relative overflow-hidden rounded-[24px] p-6 text-white shadow-[0_14px_34px_rgba(46,26,140,0.28)] md:p-7"
            style={{ background: `radial-gradient(70% 140% at 100% 0%, rgba(255,122,89,0.45) 0%, rgba(255,122,89,0) 60%), linear-gradient(135deg, ${a} 0%, ${b} 100%)` }}
          >
            <span className="pointer-events-none absolute -top-16 -right-10 h-52 w-52 rounded-full bg-white/10" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                {marca?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marca.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain shadow-lg" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <MessageSquare className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide',
                        ahoraVivo ? 'bg-coral text-coral-foreground' : 'bg-white/20 text-white',
                      )}
                    >
                      {ahoraVivo && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-foreground" />}
                      {ahoraVivo ? 'EN VIVO AHORA' : terminada ? 'TERMINADA' : 'PRÓXIMA'}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">{sesion.tipo}</span>
                  </div>
                  <h1 className="mt-2 font-heading text-2xl leading-tight font-bold tracking-tight md:text-[30px]">{sesion.titulo}</h1>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> {horaEnZona(sesion.inicio, zona)} – {horaEnZona(sesion.fin, zona)}
                    </span>
                    {sesion.sala && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {sesion.sala}
                      </span>
                    )}
                    {(sesion._count?.favoritas ?? 0) > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-current" /> {sesion._count!.favoritas} la marcaron
                      </span>
                    )}
                  </p>
                  {sesion.ponentes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sesion.ponentes.map(({ ponente: p }) => (
                        <span key={p.id} className="flex items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-1">
                          <AvatarPonente nombre={p.nombre} fotoUrl={p.foto_url} className="h-7 w-7 rounded-full bg-white text-[10px] text-[#4a35d6]" />
                          <span className="text-[13px] font-semibold">{p.nombre}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
                  conectado ? 'bg-white text-green-800' : 'bg-white/20 text-white',
                )}
                title="Lo que pasa en la app aparece aquí al instante"
              >
                <Radio className="h-3.5 w-3.5" /> {conectado ? 'Sincronizado en vivo' : 'Conectando…'}
              </span>
            </div>
            {(sesion.sponsors?.length ?? 0) > 0 && (
              <p className="relative mt-4 flex flex-wrap items-center gap-2 text-[13px] text-white/90">
                <Handshake className="h-4 w-4" /> Patrocinada por
                <span className="font-bold text-white">{sesion.sponsors!.map((x) => x.sponsor.nombre).join(' · ')}</span>
              </p>
            )}
          </section>
        </>
      )}

      {error && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {/* ---------- Indicadores ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador Icono={Clock} tono="ambar" valor={cuenta.pendiente} texto="Por moderar" />
        <Indicador Icono={CheckCircle2} tono="violeta" valor={cuenta.aprobada} texto="Aprobadas (visibles)" />
        <Indicador Icono={CheckCheck} tono="verde" valor={cuenta.respondida} texto="Respondidas" />
        <Indicador Icono={BarChart3} tono="coral" valor={abiertas} texto={`Encuesta${abiertas === 1 ? '' : 's'} abierta${abiertas === 1 ? '' : 's'}`} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ------- PREGUNTAS ------- */}
        <section className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/10 text-primary dark:text-[#a99dff]">
                <MessageSquare className="h-4 w-4" />
              </span>
              Preguntas del público
            </h2>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar preguntas">
              {FILTROS.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f.valor}
                  onClick={() => setFiltro(f.valor)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                    filtro === f.valor ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-primary/10',
                  )}
                >
                  {f.texto} · {cuenta[f.valor]}
                </button>
              ))}
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-primary/15 p-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-primary/50" />
              <p className="mt-2 font-semibold text-foreground">
                {preguntas.length === 0 ? 'Aún no hay preguntas.' : 'Nada en este filtro.'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Las preguntas que envíen desde la app aparecen aquí al instante.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visibles.map((p) => (
                <TarjetaPregunta key={p.id} pregunta={p} alModerar={moderar} />
              ))}
            </ul>
          )}
        </section>

        {/* ------- ENCUESTAS ------- */}
        <section className="space-y-4">
          <CrearEncuesta sesionId={sesionId} onCreada={cargarEncuestas} />
          {encuestas.map((e) => (
            <TarjetaEncuesta key={e.id} encuesta={e} alAlternar={() => alternar(e)} />
          ))}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const ESTADO: Record<string, { texto: string; chip: string; borde: string }> = {
  pendiente: { texto: 'Pendiente', chip: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300', borde: 'bg-amber-400' },
  aprobada: { texto: 'Aprobada', chip: 'bg-primary/10 text-primary dark:text-[#c4bbff]', borde: 'bg-primary' },
  respondida: { texto: 'Respondida', chip: 'bg-green-100 text-green-900 dark:bg-green-500/15 dark:text-green-300', borde: 'bg-green-500' },
  rechazada: { texto: 'Rechazada', chip: 'bg-muted text-muted-foreground', borde: 'bg-border' },
};

function haceCuanto(iso?: string) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function TarjetaPregunta({ pregunta: p, alModerar }: { pregunta: Pregunta; alModerar: (id: string, estado: string) => void }) {
  const e = ESTADO[p.estado] ?? ESTADO.rechazada;
  const nombre = [p.usuario?.nombre, p.usuario?.apellidos].filter(Boolean).join(' ') || 'Asistente';
  return (
    <li className={cn('flex overflow-hidden rounded-2xl border border-border bg-background/60', p.estado === 'rechazada' && 'opacity-70')}>
      <span className={cn('w-1 shrink-0', e.borde)} />
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <AvatarPonente nombre={nombre} fotoUrl={p.usuario?.foto_url ?? null} className="h-8 w-8 rounded-full text-[11px]" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-foreground">{nombre}</span>
              <span className="block text-[11.5px] text-muted-foreground">{haceCuanto(p.creado_en)}</span>
            </span>
          </span>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', e.chip)}>{e.texto}</span>
        </div>
        <p className="mt-2.5 text-[15px] leading-relaxed text-card-foreground">{p.texto}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.estado !== 'aprobada' && p.estado !== 'respondida' && (
            <Boton onClick={() => alModerar(p.id, 'aprobada')} tono="primario">
              <CheckCircle2 className="h-4 w-4" /> Aprobar
            </Boton>
          )}
          {p.estado === 'aprobada' && (
            <Boton onClick={() => alModerar(p.id, 'respondida')} tono="exito">
              <CheckCheck className="h-4 w-4" /> Marcar respondida
            </Boton>
          )}
          {p.estado !== 'rechazada' && p.estado !== 'respondida' && (
            <Boton onClick={() => alModerar(p.id, 'rechazada')} tono="peligro">
              <XCircle className="h-4 w-4" /> Rechazar
            </Boton>
          )}
        </div>
      </div>
    </li>
  );
}

function TarjetaEncuesta({ encuesta: e, alAlternar }: { encuesta: Encuesta; alAlternar: () => void }) {
  const maximo = Math.max(0, ...e.opciones.map((o) => o.votos));
  return (
    <article
      className={cn(
        'rounded-[22px] border bg-card p-5 shadow-sm',
        e.activa ? 'border-coral/60 ring-2 ring-coral/20' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              'mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide',
              e.activa ? 'bg-coral text-coral-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {e.activa && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-foreground" />}
            {e.activa ? 'ABIERTA · VOTANDO' : 'CERRADA'}
          </span>
          <p className="text-base font-bold text-card-foreground">{e.pregunta}</p>
        </div>
        <Boton onClick={alAlternar} tono={e.activa ? 'peligro' : 'primario'}>
          {e.activa ? 'Cerrar' : 'Abrir'}
        </Boton>
      </div>
      <div className="mt-4 space-y-3">
        {e.opciones.map((o) => {
          const pct = e.total > 0 ? Math.round((o.votos / e.total) * 100) : 0;
          const gana = e.total > 0 && o.votos === maximo;
          return (
            <div key={o.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className={cn(gana ? 'font-bold text-foreground' : 'text-muted-foreground')}>{o.texto}</span>
                <span className={cn('tabular-nums', gana ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                  {pct}% · {o.votos}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    gana ? 'bg-[linear-gradient(90deg,#5a46f0,#ff7a59)]' : 'bg-primary/45',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {e.total} voto{e.total === 1 ? '' : 's'}
      </p>
    </article>
  );
}

/** Formulario para crear una encuesta con opciones dinámicas. */
function CrearEncuesta({ sesionId, onCreada }: { sesionId: string; onCreada: () => void }) {
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState(['', '']);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setError(null);
    const limpias = opciones.map((o) => o.trim()).filter(Boolean);
    if (!pregunta.trim() || limpias.length < 2) {
      setError('Pon una pregunta y al menos 2 opciones.');
      return;
    }
    try {
      await apiFetch('POST', `/sesiones/${sesionId}/encuestas`, { pregunta: pregunta.trim(), opciones: limpias });
      setPregunta('');
      setOpciones(['', '']);
      onCreada();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear');
    }
  }

  return (
    <div className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-coral/15 text-orange-700 dark:text-[#ff9c80]">
          <BarChart3 className="h-4 w-4" />
        </span>
        Nueva encuesta
      </h2>
      <Input placeholder="¿Qué quieres preguntarle al público?" value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
      <div className="mt-2 space-y-2">
        {opciones.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
              {String.fromCharCode(65 + i)}
            </span>
            <Input
              placeholder={`Opción ${i + 1}`}
              value={o}
              onChange={(e) => {
                const copia = [...opciones];
                copia[i] = e.target.value;
                setOpciones(copia);
              }}
            />
            {opciones.length > 2 && (
              <button
                type="button"
                aria-label={`Quitar opción ${i + 1}`}
                onClick={() => setOpciones(opciones.filter((_, j) => j !== i))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {opciones.length < 6 && (
          <Boton onClick={() => setOpciones([...opciones, ''])} tono="neutro">
            <Plus className="h-4 w-4" /> Opción
          </Boton>
        )}
        <Boton onClick={crear} tono="primario">
          Crear encuesta
        </Boton>
        {(pregunta || opciones.some(Boolean)) && (
          <Boton
            onClick={() => {
              setPregunta('');
              setOpciones(['', '']);
              setError(null);
            }}
            tono="neutro"
          >
            <X className="h-4 w-4" /> Limpiar
          </Boton>
        )}
      </div>
    </div>
  );
}

const TONOS = {
  ambar: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  violeta: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-[#a99dff]',
  verde: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  coral: 'bg-coral/15 text-[#e85a37] dark:text-[#ff9c80]',
} as const;

function Indicador({
  Icono,
  tono,
  valor,
  texto,
}: {
  Icono: React.ComponentType<{ className?: string }>;
  tono: keyof typeof TONOS;
  valor: number;
  texto: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[20px] border border-border bg-card p-4 shadow-sm">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]', TONOS[tono])}>
        <Icono className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-heading text-[26px] leading-none font-bold text-card-foreground">{valor}</span>
        <span className="mt-1 block text-[13px] font-medium text-muted-foreground">{texto}</span>
      </span>
    </div>
  );
}

/** Botón local de esta pantalla, con "tonos" semánticos para moderar. */
function Boton({
  children,
  onClick,
  tono,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tono: 'primario' | 'exito' | 'peligro' | 'neutro';
}) {
  const estilos: Record<string, string> = {
    primario: 'bg-primary text-primary-foreground hover:bg-primary/90',
    exito: 'bg-green-600 text-white hover:bg-green-700',
    peligro: 'border border-destructive/30 bg-card text-destructive hover:bg-destructive/10',
    neutro: 'border border-border bg-card text-foreground hover:bg-muted',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${estilos[tono]}`}
    >
      {children}
    </button>
  );
}
