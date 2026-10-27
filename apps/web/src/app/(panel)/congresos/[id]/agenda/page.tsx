'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Coffee,
  Globe2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UtensilsCrossed,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogoConfirmar } from '@/components/panel/dialogo-confirmar';
import { MenuAcciones } from '@/components/panel/menu-acciones';
import { PanelLateral } from '@/components/panel/panel-lateral';
import { AvatarPonente } from '@/components/panel/avatar-ponente';
import { cn } from '@/lib/utils';
import {
  diaEnZona,
  diasDelCongreso,
  enVivo,
  etiquetaDia,
  etiquetaZona,
  horaEnZona,
} from '@/lib/zona';

type Ponente = { id: string; nombre: string; cargo: string | null; foto_url: string | null };
type Sesion = {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  sala: string | null;
  tipo: string;
  descripcion: string | null;
  ponentes: { ponente: Ponente }[];
};
type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  zona_horaria: string;
  sesiones: Sesion[];
  ponentes: Ponente[];
};

/** "09:30" -> 570 minutos. Sirve para comparar y restar horas del mismo día. */
const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** 30 -> "+30 min" · -90 -> "−1 h 30 min" */
function textoDelta(min: number): string {
  const signo = min > 0 ? '+' : '−';
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `${signo}${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`;
}

/** "09:00" + 30 -> "09:30" */
function sumarMinutos(hhmm: string, min: number): string {
  const t = aMinutos(hhmm) + min;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/**
 * ¿Se cruzan dos franjas del mismo día? Se comparan las horas en la zona del
 * evento ("09:30" < "10:00"), que es como el admin piensa la agenda.
 * Dos franjas se cruzan si cada una empieza antes de que la otra termine.
 */
function seCruzan(a: { ini: string; fin: string }, b: { ini: string; fin: string }) {
  return a.ini < b.fin && b.ini < a.fin;
}

const TIPOS = [
  { valor: 'charla', texto: 'Charla' },
  { valor: 'taller', texto: 'Taller' },
  { valor: 'plenaria', texto: 'Plenaria' },
  { valor: 'break', texto: 'Break' },
] as const;

/**
 * AGENDA de un congreso (Bloque 8.4.c).
 *
 * - Pestañas con TODOS los días del congreso (también los que aún están
 *   vacíos: hacen falta para poder crear en ellos).
 * - Las horas se muestran y se escriben en la ZONA DEL EVENTO. El formulario
 *   manda "2026-11-12T09:00" sin zona y el backend la convierte (8.4.a).
 * - Asignar ponentes es parte del mismo formulario: el admin marca quién dicta
 *   la charla y el panel se encarga de crear/quitar los vínculos.
 */
export default function AgendaCongresoPage() {
  const { id: congresoId } = useParams<{ id: string }>();
  const router = useRouter();

  const [congreso, setCongreso] = useState<Congreso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  // null = cerrado · { dia } = crear en ese día · Sesion = editar esa.
  const [enFormulario, setEnFormulario] = useState<Sesion | { dia: string } | null>(null);
  const [aBorrar, setABorrar] = useState<Sesion | null>(null);

  const cargar = useCallback(async () => {
    try {
      setCongreso(await apiFetch<Congreso>('GET', `/congresos/${congresoId}`));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar la agenda');
    }
  }, [congresoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const zona = congreso?.zona_horaria ?? 'America/Bogota';
  const dias = useMemo(
    () => (congreso ? diasDelCongreso(congreso.fecha_inicio, congreso.fecha_fin) : []),
    [congreso],
  );

  // Sesiones agrupadas por su día EN LA ZONA DEL EVENTO.
  const porDia = useMemo(() => {
    const m = new Map<string, Sesion[]>();
    for (const s of congreso?.sesiones ?? []) {
      const k = diaEnZona(s.inicio, zona);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [congreso, zona]);

  async function borrar() {
    const victima = aBorrar;
    setABorrar(null);
    if (!victima) return;
    try {
      await apiFetch('DELETE', `/sesiones/${victima.id}`);
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo borrar la sesión');
    }
  }

  if (!congreso) {
    return error ? <p className="p-8 text-destructive">{error}</p> : <p className="p-8 text-muted-foreground">Cargando…</p>;
  }

  const hoy = diaEnZona(new Date().toISOString(), zona);
  const diaActivo = (diaElegido && dias.includes(diaElegido) ? diaElegido : null) ?? (dias.includes(hoy) ? hoy : dias[0]);
  const sesionesDelDia = porDia.get(diaActivo) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <Link
        href={`/congresos/${congresoId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al congreso
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {congreso.nombre} · {congreso.sesiones.length} bloque{congreso.sesiones.length === 1 ? '' : 's'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> Horas del evento: {etiquetaZona(zona)}
          </p>
        </div>
        <Button size="sm" onClick={() => setEnFormulario({ dia: diaActivo })}>
          <Plus /> Nueva sesión
        </Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* ---------- Pestañas de días ---------- */}
      {dias.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {dias.map((k) => {
            const activo = k === diaActivo;
            const { semana, dia } = etiquetaDia(k);
            const n = porDia.get(k)?.length ?? 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDiaElegido(k)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-left transition-colors',
                  activo
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-foreground hover:border-primary/40',
                )}
              >
                <span className={cn('block text-xs', activo ? 'text-white/80' : 'text-muted-foreground')}>
                  {semana}
                  {k === hoy ? ' · hoy' : ''}
                </span>
                <span className="block font-[family-name:var(--font-space-grotesk)] font-semibold">
                  {dia} <span className={cn('text-xs font-normal', activo ? 'text-white/70' : 'text-muted-foreground')}>· {n}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- Sesiones del día ---------- */}
      {sesionesDelDia.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Este día todavía no tiene sesiones.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setEnFormulario({ dia: diaActivo })}>
            <Plus /> Agregar la primera
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sesionesDelDia.map((s) => (
            <li key={s.id}>
              <FilaSesion
                sesion={s}
                zona={zona}
                cruces={sesionesDelDia.filter(
                  (o) =>
                    o.id !== s.id &&
                    seCruzan(
                      { ini: horaEnZona(s.inicio, zona), fin: horaEnZona(s.fin, zona) },
                      { ini: horaEnZona(o.inicio, zona), fin: horaEnZona(o.fin, zona) },
                    ),
                )}
                alEditar={() => setEnFormulario(s)}
                alBorrar={() => setABorrar(s)}
                alModerar={() => router.push(`/sesiones/${s.id}`)}
              />
            </li>
          ))}
        </ul>
      )}

      <PanelLateral
        abierto={enFormulario !== null}
        titulo={enFormulario && 'id' in enFormulario ? 'Editar sesión' : 'Nueva sesión'}
        subtitulo={congreso.nombre}
        alCerrar={() => setEnFormulario(null)}
      >
        {enFormulario !== null && (
          <FormularioSesion
            key={'id' in enFormulario ? enFormulario.id : `nueva-${enFormulario.dia}`}
            congreso={congreso}
            dias={dias}
            sesion={'id' in enFormulario ? enFormulario : null}
            diaInicial={'id' in enFormulario ? diaEnZona(enFormulario.inicio, zona) : enFormulario.dia}
            alGuardar={async (dia) => {
              setEnFormulario(null);
              setDiaElegido(dia); // quedarse viendo el día donde quedó la sesión
              await cargar();
            }}
            alCancelar={() => setEnFormulario(null)}
          />
        )}
      </PanelLateral>

      <DialogoConfirmar
        abierto={aBorrar !== null}
        titulo={`¿Borrar «${aBorrar?.titulo}»?`}
        mensaje="Se borra de la agenda junto con su asignación de ponentes. Los ponentes no se borran."
        textoConfirmar="Borrar"
        peligroso
        alConfirmar={borrar}
        alCancelar={() => setABorrar(null)}
      />
    </div>
  );
}

/** Una fila de la agenda, con su menú de acciones. */
function FilaSesion({
  sesion,
  zona,
  cruces,
  alEditar,
  alBorrar,
  alModerar,
}: {
  sesion: Sesion;
  zona: string;
  /** Las otras sesiones del día que se cruzan con esta (puede ser a propósito: salas en paralelo). */
  cruces: Sesion[];
  alEditar: () => void;
  alBorrar: () => void;
  alModerar: () => void;
}) {
  const horario = `${horaEnZona(sesion.inicio, zona)} – ${horaEnZona(sesion.fin, zona)}${sesion.sala ? ` · ${sesion.sala}` : ''}`;
  const esBreak = sesion.tipo === 'break';
  const vivo = enVivo(sesion.inicio, sesion.fin);
  const ponentes = sesion.ponentes.map((x) => x.ponente);

  // Aviso de cruce: en ámbar, porque no siempre es un error (puede haber
  // charlas en paralelo en salas distintas), pero conviene que se vea.
  const avisoCruce =
    cruces.length > 0 ? (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        Se cruza con «{cruces[0].titulo}»
        {cruces.length > 1 ? ` y ${cruces.length - 1} más` : ''}
      </p>
    ) : null;

  const menu = (
    <MenuAcciones
      etiqueta={`Acciones de ${sesion.titulo}`}
      acciones={[
        { texto: 'Editar', Icono: Pencil, alHacer: alEditar },
        ...(esBreak ? [] : [{ texto: 'Moderar en vivo', Icono: MessageSquare, alHacer: alModerar }]),
        { texto: 'Borrar', Icono: Trash2, peligroso: true, alHacer: alBorrar },
      ]}
    />
  );

  if (esBreak) {
    const Icono = /almuerzo/i.test(sesion.titulo) ? UtensilsCrossed : Coffee;
    return (
      <div
        onClick={alEditar}
        className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/70"
      >
        <Icono className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{sesion.titulo}</p>
          <p className="text-xs">{horario}</p>
          {avisoCruce}
        </div>
        {menu}
      </div>
    );
  }

  return (
    <div
      onClick={alEditar}
      className="flex cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary/40"
    >
      <span className={cn('w-1 shrink-0', vivo ? 'bg-coral' : 'bg-primary')} />
      <div className="flex flex-1 items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-primary">{horario}</span>
            {vivo && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">EN VIVO</span>
            )}
            {sesion.tipo === 'taller' && (
              <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[11px] font-bold text-coral">TALLER</span>
            )}
            {sesion.tipo === 'plenaria' && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">PLENARIA</span>
            )}
          </div>
          <p className="mt-1 font-semibold text-card-foreground">{sesion.titulo}</p>
          {ponentes.length > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-2">
                {ponentes.slice(0, 3).map((p) => (
                  <AvatarPonente key={p.id} nombre={p.nombre} fotoUrl={p.foto_url} className="h-7 w-7 rounded-lg text-[10px] ring-2 ring-card" />
                ))}
              </div>
              <span className="truncate text-sm text-muted-foreground">{ponentes.map((p) => p.nombre).join(', ')}</span>
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium text-coral">Sin ponente asignado</p>
          )}
          {avisoCruce}
        </div>
        {menu}
      </div>
    </div>
  );
}

/**
 * Formulario de crear/editar sesión.
 *
 * Al guardar, además de la sesión, sincroniza sus ponentes: compara los que
 * tenía con los marcados y crea/quita solo la diferencia. El orden importa:
 * primero se QUITAN (por si la sesión se está convirtiendo en break, que no
 * admite ponentes), luego se guarda la sesión y al final se AGREGAN.
 */
function FormularioSesion({
  congreso,
  dias,
  sesion,
  diaInicial,
  alGuardar,
  alCancelar,
}: {
  congreso: Congreso;
  dias: string[];
  sesion: Sesion | null;
  diaInicial: string;
  alGuardar: (dia: string) => Promise<void>;
  alCancelar: () => void;
}) {
  const zona = congreso.zona_horaria;
  const [form, setForm] = useState({
    titulo: sesion?.titulo ?? '',
    tipo: sesion?.tipo ?? 'charla',
    dia: diaInicial,
    horaInicio: sesion ? horaEnZona(sesion.inicio, zona) : '09:00',
    horaFin: sesion ? horaEnZona(sesion.fin, zona) : '10:00',
    sala: sesion?.sala ?? '',
    descripcion: sesion?.descripcion ?? '',
  });
  const actuales = useMemo(() => sesion?.ponentes.map((x) => x.ponente.id) ?? [], [sesion]);
  const [elegidos, setElegidos] = useState<string[]>(actuales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [correr, setCorrer] = useState(true);

  const esBreak = form.tipo === 'break';
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const sesionesDe = (dia: string) => congreso.sesiones.filter((s) => diaEnZona(s.inicio, zona) === dia);

  // ---- "Correr la agenda" (solo al EDITAR, si cambia el fin y sigue el mismo día)
  // Las "siguientes" son las que empezaban a partir del fin VIEJO, igual que
  // las elige el backend.
  const diaOriginal = sesion ? diaEnZona(sesion.inicio, zona) : null;
  const finOriginal = sesion ? horaEnZona(sesion.fin, zona) : null;
  const delta =
    sesion && finOriginal && form.dia === diaOriginal ? aMinutos(form.horaFin) - aMinutos(finOriginal) : 0;
  const siguientes =
    sesion && diaOriginal && finOriginal
      ? sesionesDe(diaOriginal).filter((s) => s.id !== sesion.id && horaEnZona(s.inicio, zona) >= finOriginal)
      : [];
  const puedeCorrer = delta !== 0 && siguientes.length > 0;
  const correrActivo = puedeCorrer && correr;

  // ---- Cruces de horario con otras sesiones del mismo día.
  // Si se van a correr las siguientes, esas ya no cuentan: se apartan solas.
  const cruces = sesionesDe(form.dia).filter(
    (s) =>
      s.id !== sesion?.id &&
      !(correrActivo && siguientes.some((x) => x.id === s.id)) &&
      seCruzan(
        { ini: form.horaInicio, fin: form.horaFin },
        { ini: horaEnZona(s.inicio, zona), fin: horaEnZona(s.fin, zona) },
      ),
  );
  const vacioANull = (v: string) => (v.trim() ? v.trim() : null);

  function alternar(id: string) {
    setElegidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const datos = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      // SIN zona a propósito: el backend lo interpreta en la zona del congreso.
      inicio: `${form.dia}T${form.horaInicio}`,
      fin: `${form.dia}T${form.horaFin}`,
      sala: vacioANull(form.sala),
      descripcion: vacioANull(form.descripcion),
    };
    const deseados = esBreak ? [] : elegidos;

    try {
      let id = sesion?.id;
      if (sesion) {
        for (const pid of actuales.filter((x) => !deseados.includes(x))) {
          await apiFetch('DELETE', `/sesiones/${sesion.id}/ponentes/${pid}`);
        }
        await apiFetch('PATCH', `/sesiones/${sesion.id}`, {
          ...datos,
          // El backend corre las siguientes en la MISMA transacción.
          ...(correrActivo ? { correr_siguientes: true } : {}),
        });
      } else {
        const creada = await apiFetch<{ id: string }>('POST', `/congresos/${congreso.id}/sesiones`, datos);
        id = creada.id;
      }
      for (const pid of deseados.filter((x) => !actuales.includes(x))) {
        await apiFetch('POST', `/sesiones/${id}/ponentes/${pid}`);
      }
      await alGuardar(form.dia);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="sesion-titulo">Título</Label>
        <Input
          id="sesion-titulo"
          value={form.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          required
          placeholder={esBreak ? 'Café y networking' : 'Conferencia inaugural'}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => set('tipo', t.valor)}
              className={cn(
                'rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                form.tipo === t.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.texto}
            </button>
          ))}
        </div>
        {esBreak && (
          <p className="text-xs text-muted-foreground">
            Un break (café, almuerzo…) ocupa su hueco en la agenda, pero no lleva ponentes ni preguntas.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sesion-dia">Día</Label>
        <select
          id="sesion-dia"
          value={form.dia}
          onChange={(e) => set('dia', e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {dias.map((k) => {
            const { semana, dia } = etiquetaDia(k);
            return (
              <option key={k} value={k} className="bg-card">
                {semana} {dia}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sesion-inicio">Inicio</Label>
            <Input id="sesion-inicio" type="time" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sesion-fin">Fin</Label>
            <Input id="sesion-fin" type="time" value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} required />
          </div>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe2 className="h-3.5 w-3.5" /> Hora del evento ({etiquetaZona(zona)}), estés donde estés.
        </p>
      </div>

      {puedeCorrer && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={correr}
              onChange={(e) => setCorrer(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#5A46F0]"
            />
            <span className="text-sm text-foreground">
              Correr también {siguientes.length === 1 ? 'la sesión siguiente' : `las ${siguientes.length} sesiones siguientes`} de
              este día <strong>{textoDelta(delta)}</strong>
            </span>
          </label>
          {correr && (
            <ul className="mt-2 space-y-0.5 pl-6 text-xs text-muted-foreground">
              {siguientes.map((s) => (
                <li key={s.id}>
                  <span className="font-mono">
                    {horaEnZona(s.inicio, zona)} → {sumarMinutos(horaEnZona(s.inicio, zona), delta)}
                  </span>{' '}
                  · {s.titulo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {cruces.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <TriangleAlert className="h-4 w-4" /> Se cruza con:
          </p>
          <ul className="mt-1 space-y-0.5 pl-6 text-xs text-amber-800 dark:text-amber-300">
            {cruces.map((s) => (
              <li key={s.id}>
                <span className="font-mono">
                  {horaEnZona(s.inicio, zona)}–{horaEnZona(s.fin, zona)}
                </span>{' '}
                · {s.titulo}
                {s.sala ? ` · ${s.sala}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Puedes guardar igual si son actividades en paralelo (por ejemplo, en salas distintas).
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sesion-sala">Sala (opcional)</Label>
        <Input id="sesion-sala" value={form.sala} onChange={(e) => set('sala', e.target.value)} placeholder="Auditorio principal" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sesion-descripcion">Descripción (opcional)</Label>
        <textarea
          id="sesion-descripcion"
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={3}
          maxLength={800}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {!esBreak && (
        <div className="space-y-1.5">
          <Label>Ponentes</Label>
          {congreso.ponentes.length === 0 ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Este congreso todavía no tiene speakers.{' '}
              <Link href={`/congresos/${congreso.id}/speakers`} className="font-medium text-primary">
                Créalos primero
              </Link>
              .
            </p>
          ) : (
            <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {congreso.ponentes.map((p) => {
                const marcado = elegidos.includes(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
                        marcado ? 'bg-primary/10' : 'hover:bg-muted',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternar(p.id)}
                        className="h-4 w-4 accent-[#5A46F0]"
                      />
                      <AvatarPonente nombre={p.nombre} fotoUrl={p.foto_url} className="h-8 w-8 rounded-lg text-[11px]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{p.nombre}</span>
                        {p.cargo && <span className="block truncate text-xs text-muted-foreground">{p.cargo}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {esBreak && actuales.length > 0 && (
        <p className="rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">
          Al guardarla como break se le quitarán sus {actuales.length} ponente{actuales.length === 1 ? '' : 's'}.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : sesion ? 'Guardar cambios' : 'Crear sesión'}
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
