'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Clock,
  Globe2,
  Send,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogoConfirmar } from '@/components/panel/dialogo-confirmar';
import { cn } from '@/lib/utils';
import { diaEnZona, etiquetaDia, etiquetaZona, horaEnZona } from '@/lib/zona';

type Sesion = { id: string; titulo: string; inicio: string; tipo: string };
type Congreso = { id: string; nombre: string; zona_horaria: string; sesiones: Sesion[] };
type Notificacion = {
  id: string;
  titulo: string;
  cuerpo: string;
  destino: string;
  estado: 'programada' | 'enviando' | 'enviada' | 'fallida' | string;
  enviados: number;
  fallidos: number;
  creado_en: string;
  enviado_en: string | null;
  programada_para: string | null;
  sesion: { id: string; titulo: string } | null;
  creado_por: { nombre: string } | null;
};

const MAX_TITULO = 65;
const MAX_CUERPO = 240;

/**
 * NOTIFICACIONES de un congreso (Bloque 8.6.b).
 *
 * Arriba se redacta el aviso: para todo el congreso o sobre una charla, y para
 * enviar YA o PROGRAMAR. La hora programada es la del lugar del evento (el
 * mismo acuerdo de la agenda). Al lado, una vista previa de cómo se verá en la
 * pantalla bloqueada del teléfono.
 *
 * Abajo, el historial: programados (se pueden cancelar), enviados (con cuántos
 * teléfonos los recibieron) y fallidos. Se refresca solo cada 30 s, para ver
 * cuando un programado sale.
 *
 * Todo aviso queda también en la bandeja "Avisos" de la app, así que llega
 * aunque el asistente no tenga activadas las notificaciones.
 */
export default function NotificacionesCongresoPage() {
  const { id: congresoId } = useParams<{ id: string }>();

  const [congreso, setCongreso] = useState<Congreso | null>(null);
  const [historial, setHistorial] = useState<Notificacion[]>([]);
  const [inscritos, setInscritos] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      setHistorial(await apiFetch<Notificacion[]>('GET', `/congresos/${congresoId}/notificaciones`));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el historial');
    }
  }, [congresoId]);

  useEffect(() => {
    (async () => {
      try {
        const [c, asistentes] = await Promise.all([
          apiFetch<Congreso>('GET', `/congresos/${congresoId}`),
          apiFetch<unknown[]>('GET', `/congresos/${congresoId}/asistentes`),
        ]);
        setCongreso(c);
        setInscritos(asistentes.length);
      } catch (e: any) {
        setError(e.message ?? 'No se pudo cargar el congreso');
      }
    })();
    cargarHistorial();
    // Refresco automático: así se ve cuando un programado pasa a "enviado".
    const reloj = setInterval(cargarHistorial, 30_000);
    return () => clearInterval(reloj);
  }, [congresoId, cargarHistorial]);

  if (!congreso) {
    return error ? <p className="p-8 text-destructive">{error}</p> : <p className="p-8 text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <Link
        href={`/congresos/${congresoId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al congreso
      </Link>

      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
          Notificaciones
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <span>{congreso.nombre}</span>
          {inscritos !== null && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {inscritos} inscrito{inscritos === 1 ? '' : 's'}
            </span>
          )}
        </p>
      </header>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Redactor congreso={congreso} inscritos={inscritos} alEnviar={cargarHistorial} />

      <h2 className="mb-3 mt-10 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-foreground">
        Historial
      </h2>
      <Historial
        avisos={historial}
        zona={congreso.zona_horaria}
        alCancelar={async (n) => {
          try {
            await apiFetch('DELETE', `/notificaciones/${n.id}`);
            await cargarHistorial();
          } catch (e: any) {
            setError(e.message ?? 'No se pudo cancelar');
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Redactar
// ---------------------------------------------------------------------------

function Redactor({
  congreso,
  inscritos,
  alEnviar,
}: {
  congreso: Congreso;
  inscritos: number | null;
  alEnviar: () => Promise<void>;
}) {
  const zona = congreso.zona_horaria;
  // Valores iniciales para programar: hoy (en la zona del evento) dentro de una hora.
  const enUnaHora = new Date(Date.now() + 3600_000).toISOString();
  const [form, setForm] = useState({
    titulo: '',
    cuerpo: '',
    destino: 'todos' as 'todos' | 'sesion',
    sesionId: '',
    cuando: 'ahora' as 'ahora' | 'programar',
    dia: diaEnZona(enUnaHora, zona),
    hora: horaEnZona(enUnaHora, zona),
  });
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Las charlas (no los breaks), con su día y hora del evento, para elegir.
  const charlas = useMemo(
    () => congreso.sesiones.filter((s) => s.tipo !== 'break'),
    [congreso.sesiones],
  );
  const sesionElegida = charlas.find((s) => s.id === form.sesionId);

  const listo =
    form.titulo.trim() && form.cuerpo.trim() && (form.destino === 'todos' || form.sesionId);

  async function enviar() {
    setConfirmar(false);
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      const n = await apiFetch<Notificacion>('POST', `/congresos/${congreso.id}/notificaciones`, {
        titulo: form.titulo.trim(),
        cuerpo: form.cuerpo.trim(),
        destino: form.destino,
        ...(form.destino === 'sesion' ? { sesion_id: form.sesionId } : {}),
        // SIN zona a propósito: el backend lo interpreta en la zona del congreso.
        ...(form.cuando === 'programar' ? { programada_para: `${form.dia}T${form.hora}` } : {}),
      });
      setAviso(
        n.estado === 'programada'
          ? `Programado para el ${etiquetaDia(form.dia).dia} a las ${form.hora}.`
          : `Enviado. Llegó a ${n.enviados} teléfono${n.enviados === 1 ? '' : 's'} y quedó en la bandeja "Avisos" de la app.`,
      );
      setForm((f) => ({ ...f, titulo: '', cuerpo: '' }));
      await alEnviar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo enviar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="grid gap-6 rounded-xl border border-border bg-card p-5 shadow-sm lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-card-foreground">
          <Bell className="h-4 w-4 text-primary" /> Nuevo aviso
        </h2>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="aviso-titulo">Título</Label>
            <Contador n={form.titulo.length} max={MAX_TITULO} />
          </div>
          <Input
            id="aviso-titulo"
            value={form.titulo}
            maxLength={MAX_TITULO}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Cambio de sala"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="aviso-cuerpo">Mensaje</Label>
            <Contador n={form.cuerpo.length} max={MAX_CUERPO} />
          </div>
          <textarea
            id="aviso-cuerpo"
            value={form.cuerpo}
            maxLength={MAX_CUERPO}
            onChange={(e) => set('cuerpo', e.target.value)}
            rows={3}
            placeholder="La charla de las 11:00 pasa al Auditorio principal."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label>¿Sobre qué?</Label>
          <Segmentado
            opciones={[
              { valor: 'todos', texto: 'Todo el congreso' },
              { valor: 'sesion', texto: 'Una charla' },
            ]}
            valor={form.destino}
            alCambiar={(v) => set('destino', v as 'todos' | 'sesion')}
          />
          {form.destino === 'sesion' && (
            <>
              <select
                value={form.sesionId}
                onChange={(e) => set('sesionId', e.target.value)}
                className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" className="bg-card">Elige la charla…</option>
                {charlas.map((s) => (
                  <option key={s.id} value={s.id} className="bg-card">
                    {etiquetaDia(diaEnZona(s.inicio, zona)).dia} · {horaEnZona(s.inicio, zona)} · {s.titulo}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Llega a todos los inscritos; al tocarlo, la app abre esa charla.
              </p>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>¿Cuándo?</Label>
          <Segmentado
            opciones={[
              { valor: 'ahora', texto: 'Enviar ahora' },
              { valor: 'programar', texto: 'Programar' },
            ]}
            valor={form.cuando}
            alCambiar={(v) => set('cuando', v as 'ahora' | 'programar')}
          />
          {form.cuando === 'programar' && (
            <>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Input type="date" value={form.dia} onChange={(e) => set('dia', e.target.value)} />
                <Input type="time" value={form.hora} onChange={(e) => set('hora', e.target.value)} />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe2 className="h-3.5 w-3.5" /> Hora del evento ({etiquetaZona(zona)}).
                Sale sola a esa hora, mientras el sistema esté en línea.
              </p>
            </>
          )}
        </div>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {aviso && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{aviso}</p>}

        <Button
          disabled={!listo || enviando}
          onClick={() => (form.cuando === 'ahora' ? setConfirmar(true) : enviar())}
        >
          {form.cuando === 'ahora' ? <Send /> : <CalendarClock />}
          {enviando ? 'Enviando…' : form.cuando === 'ahora' ? 'Enviar ahora' : 'Programar aviso'}
        </Button>
      </div>

      {/* Vista previa: así se ve en la pantalla bloqueada del teléfono */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Así se verá</p>
        <div className="rounded-2xl bg-gradient-to-b from-slate-700 to-slate-900 p-4 pb-16">
          <p className="text-center font-[family-name:var(--font-space-grotesk)] text-4xl font-light text-white/90">
            {horaEnZona(new Date().toISOString(), zona)}
          </p>
          <div className="mt-6 rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="grid h-4 w-4 place-items-center rounded bg-[#5A46F0] text-[9px] font-bold text-white">N</span>
              NEXVIO · ahora
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{form.titulo || 'Título del aviso'}</p>
            <p className="line-clamp-3 text-[13px] leading-snug text-slate-700">
              {form.cuerpo || 'Aquí va el mensaje que leerán los asistentes.'}
            </p>
          </div>
          {sesionElegida && (
            <p className="mt-2 text-center text-[11px] text-white/60">Al tocarlo abre «{sesionElegida.titulo}»</p>
          )}
        </div>
      </div>

      <DialogoConfirmar
        abierto={confirmar}
        titulo="¿Enviar el aviso ahora?"
        mensaje={`Llegará a ${inscritos ?? 'todos los'} inscrito${inscritos === 1 ? '' : 's'} del congreso. Un aviso enviado no se puede deshacer.`}
        textoConfirmar="Enviar"
        alConfirmar={enviar}
        alCancelar={() => setConfirmar(false)}
      />
    </section>
  );
}

function Contador({ n, max }: { n: number; max: number }) {
  return <span className={cn('text-xs', n > max * 0.9 ? 'text-amber-600' : 'text-muted-foreground')}>{n}/{max}</span>;
}

function Segmentado({
  opciones,
  valor,
  alCambiar,
}: {
  opciones: { valor: string; texto: string }[];
  valor: string;
  alCambiar: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => alCambiar(o.valor)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            valor === o.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  programada: { texto: 'Programado', clase: 'bg-primary/10 text-primary' },
  enviando: { texto: 'Enviando…', clase: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  enviada: { texto: 'Enviado', clase: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  fallida: { texto: 'Push sin entregar', clase: 'bg-destructive/10 text-destructive' },
};

function Historial({
  avisos,
  zona,
  alCancelar,
}: {
  avisos: Notificacion[];
  zona: string;
  alCancelar: (n: Notificacion) => Promise<void>;
}) {
  const [aCancelar, setACancelar] = useState<Notificacion | null>(null);
  const fecha = (iso: string) => `${etiquetaDia(diaEnZona(iso, zona)).dia} · ${horaEnZona(iso, zona)}`;

  if (avisos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
        <Bell className="mx-auto h-8 w-8" />
        <p className="mt-2">Todavía no se ha enviado ningún aviso.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {avisos.map((n) => {
          const e = ESTADOS[n.estado] ?? { texto: n.estado, clase: 'bg-muted text-muted-foreground' };
          return (
            <li key={n.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', e.clase)}>{e.texto}</span>
                    {n.sesion && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Sobre: {n.sesion.titulo}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 font-semibold text-card-foreground">{n.titulo}</p>
                  <p className="text-sm text-muted-foreground">{n.cuerpo}</p>
                </div>
                {n.estado === 'programada' && (
                  <Button variant="outline" size="sm" onClick={() => setACancelar(n)}>
                    <Trash2 /> Cancelar
                  </Button>
                )}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {n.estado === 'programada' && n.programada_para && (
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Sale el {fecha(n.programada_para)}</span>
                )}
                {n.enviado_en && (
                  <span className="inline-flex items-center gap-1"><Send className="h-3.5 w-3.5" /> {fecha(n.enviado_en)}</span>
                )}
                {(n.estado === 'enviada' || n.estado === 'fallida') && (
                  <span className="inline-flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" /> {n.enviados} teléfono{n.enviados === 1 ? '' : 's'}
                    {n.fallidos > 0 && ` · ${n.fallidos} sin entregar`}
                  </span>
                )}
                {n.creado_por && <span>por {n.creado_por.nombre}</span>}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        «Teléfonos» cuenta las notificaciones push entregadas. Todos los avisos quedan además en la bandeja
        «Avisos» de la app, aunque la persona no tenga activadas las notificaciones.
      </p>

      <DialogoConfirmar
        abierto={aCancelar !== null}
        titulo="¿Cancelar este aviso programado?"
        mensaje={`«${aCancelar?.titulo}» no se enviará.`}
        textoConfirmar="Cancelar aviso"
        textoCancelar="Volver"
        peligroso
        alConfirmar={async () => {
          const n = aCancelar;
          setACancelar(null);
          if (n) await alCancelar(n);
        }}
        alCancelar={() => setACancelar(null)}
      />
    </>
  );
}
