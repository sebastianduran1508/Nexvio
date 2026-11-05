'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Coffee,
  Handshake,
  MapPin,
  MessageSquare,
  Mic2,
  Palette,
  Pencil,
  Star,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AvatarPonente, bandera } from '@/components/panel/avatar-ponente';
import { EsqueletoPagina } from '@/components/panel/encabezado-pagina';
import { PanelLateral } from '@/components/panel/panel-lateral';
import { EditarCongreso } from '@/components/panel/editar-congreso';
import { sigla } from '@/components/panel/tarjeta-congreso';
import { diaEnZona, enVivo, etiquetaDia, horaEnZona } from '@/lib/zona';

type Ponente = {
  id: string;
  nombre: string;
  foto_url?: string | null;
  cargo?: string | null;
  empresa?: string | null;
  pais?: string | null;
  pais_codigo?: string | null;
};
type Sesion = {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  sala?: string | null;
  tipo?: string;
  ponentes?: { ponente: Ponente }[];
  _count?: { favoritas: number };
};
type CongresoDetalle = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  zona_horaria: string;
  descripcion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  lugar?: string | null;
  sesiones: Sesion[];
  ponentes: Ponente[];
  sponsors: { id: string; nombre: string; logo_url: string | null; nivel?: string | null }[];
  personalizacion: {
    logo_url: string | null;
    imagen_portada_url: string | null;
    color_primario: string | null;
    color_secundario: string | null;
  } | null;
  _count?: { inscripciones: number };
};

/** Las fechas del congreso llegan a medianoche UTC: se leen en UTC. */
function fechaCongreso(iso: string) {
  return new Date(iso)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace(/\./g, '');
}

/**
 * INICIO DE UN CONGRESO en el panel (8.7.h).
 *
 * Es la "portada" del congreso: lleva SU marca (portada, logo y colores de
 * Apariencia), para que el organizador sienta la personalización desde que
 * entra. Debajo, accesos a cada sección con sus números, las PRÓXIMAS
 * sesiones (un adelanto, no otra agenda: la agenda es una sola, en
 * /congresos/:id/agenda) y los ponentes y sponsors.
 */
export default function CongresoDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [version, setVersion] = useState(0); // sube al guardar -> se recarga

  useEffect(() => {
    (async () => {
      try {
        setDetalle(await apiFetch<CongresoDetalle>('GET', `/congresos/${params.id}`));
      } catch (e: any) {
        if (String(e.message).includes('401')) router.replace('/login');
        else setError('No se pudo cargar el congreso');
      }
    })();
  }, [params.id, router, version]);

  const dias = useMemo(() => {
    const s = new Set<string>();
    for (const x of detalle?.sesiones ?? []) s.add(diaEnZona(x.inicio, detalle!.zona_horaria));
    return s.size;
  }, [detalle]);

  if (error) return <p className="p-8 text-destructive">{error}</p>;
  if (!detalle) return <EsqueletoPagina />;

  const zona = detalle.zona_horaria;
  const marca = detalle.personalizacion;
  const a = marca?.color_primario || '#4a35d6';
  const b = marca?.color_secundario || '#7c3aed';
  const charlas = detalle.sesiones.filter((s) => s.tipo !== 'break');
  const estrellas = detalle.sesiones.reduce((n, s) => n + (s._count?.favoritas ?? 0), 0);

  // Adelanto: las que aún no terminan; si el congreso ya pasó, las primeras.
  const ahora = Date.now();
  const pendientes = detalle.sesiones.filter((s) => new Date(s.fin).getTime() > ahora);
  const adelanto = (pendientes.length > 0 ? pendientes : detalle.sesiones).slice(0, 6);
  const yaPaso = pendientes.length === 0 && detalle.sesiones.length > 0;

  const base = `/congresos/${detalle.id}`;
  const accesos = [
    { href: `${base}/agenda`, texto: 'Agenda', dato: `${charlas.length} sesiones`, Icono: CalendarDays, tono: 'from-[#5a46f0] to-[#7c3aed]' },
    { href: `${base}/speakers`, texto: 'Speakers', dato: `${detalle.ponentes.length} ponentes`, Icono: Mic2, tono: 'from-[#ff7a59] to-[#e8473a]' },
    { href: `${base}/sponsors`, texto: 'Sponsors', dato: `${detalle.sponsors.length} patrocinadores`, Icono: Handshake, tono: 'from-[#f59e0b] to-[#d97706]' },
    { href: `${base}/asistentes`, texto: 'Asistentes', dato: `${detalle._count?.inscripciones ?? '—'} inscritos`, Icono: Users, tono: 'from-[#22c55e] to-[#15803d]' },
    { href: `${base}/notificaciones`, texto: 'Notificaciones', dato: 'Avisos a la app', Icono: Bell, tono: 'from-[#06b6d4] to-[#0e7490]' },
    { href: `${base}/apariencia`, texto: 'Apariencia', dato: 'Logo, portada y colores', Icono: Palette, tono: 'from-[#ec4899] to-[#be185d]' },
  ];

  return (
    <div className="contenido-panel">
      <nav aria-label="Ruta" className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-muted-foreground">
        <Link href="/congresos" className="hover:text-primary">Congresos</Link> › <span>{detalle.nombre}</span>
      </nav>

      {/* ---------- Portada con la marca del congreso ---------- */}
      <section className="relative overflow-hidden rounded-[26px] shadow-[0_16px_40px_rgba(46,26,140,0.25)]">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)` }} />
        {marca?.imagen_portada_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={marca.imagen_portada_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* Velo para que el texto blanco se lea sobre cualquier portada */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,11,24,0.82)_0%,rgba(13,11,24,0.55)_55%,rgba(13,11,24,0.2)_100%)]" />
        {!marca?.imagen_portada_url && (
          <>
            <span className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute right-40 -bottom-24 h-44 w-44 rounded-full bg-white/10" />
          </>
        )}

        <div className="relative flex min-h-[260px] flex-col justify-end gap-5 p-6 text-white md:flex-row md:items-end md:justify-between md:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
            <span
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-4 border-white/90 bg-white font-heading text-3xl font-bold shadow-xl"
              style={{ color: a }}
            >
              {marca?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={marca.logo_url} alt={`Logo de ${detalle.nombre}`} className="h-full w-full object-contain" />
              ) : (
                sigla(detalle.nombre)
              )}
            </span>
            <div className="min-w-0">
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase',
                  detalle.estado === 'publicado' ? 'bg-green-400 text-green-950' : 'bg-amber-400 text-amber-950',
                )}
              >
                {detalle.estado}
              </span>
              <h1 className="mt-2 font-heading text-[28px] leading-tight font-bold tracking-tight md:text-[34px]">{detalle.nombre}</h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/90">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {fechaCongreso(detalle.fecha_inicio)} – {fechaCongreso(detalle.fecha_fin)}
                </span>
                {(detalle.lugar || detalle.ciudad) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {[detalle.lugar, detalle.ciudad].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {detalle.descripcion && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">{detalle.descripcion}</p>}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#4a35d6] shadow-md transition hover:bg-white/90"
          >
            <Pencil className="h-4 w-4" /> Editar datos y fechas
          </button>
          <div className="flex flex-wrap gap-2">
            <Dato valor={dias} texto={dias === 1 ? 'día' : 'días'} />
            <Dato valor={charlas.length} texto="sesiones" />
            <Dato valor={detalle._count?.inscripciones ?? 0} texto="inscritos" />
            <Dato valor={estrellas} texto="⭐ marcadas" />
          </div>
          </div>
        </div>
      </section>

      {/* ---------- Accesos ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        {accesos.map(({ href, texto, dato, Icono, tono }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-[20px] border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <span className={cn('flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-md', tono)}>
              <Icono className="h-5 w-5" />
            </span>
            <span>
              <span className="flex items-center justify-between font-bold text-card-foreground">
                {texto}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </span>
              <span className="text-[13px] text-muted-foreground">{dato}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- Próximas sesiones (adelanto de LA agenda) ---------- */}
        <section className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/10 text-primary dark:text-[#a99dff]">
                <CalendarDays className="h-4 w-4" />
              </span>
              {yaPaso ? 'Así fue la agenda' : 'Próximas sesiones'}
            </h2>
            <Link href={`${base}/agenda`} className="flex items-center gap-1 text-sm font-bold text-primary dark:text-[#a99dff]">
              Ver la agenda completa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {adelanto.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-primary/15 p-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-primary/50" />
              <p className="mt-2 font-semibold text-foreground">Este congreso aún no tiene sesiones.</p>
              <Link href={`${base}/agenda`} className="mt-3 inline-block text-sm font-bold text-primary">
                Armar la agenda →
              </Link>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {adelanto.map((s) => (
                <FilaAdelanto key={s.id} sesion={s} zona={zona} />
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-6">
          {/* ---------- Ponentes ---------- */}
          <section className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-coral/15 text-orange-700 dark:text-[#ff9c80]">
                  <Mic2 className="h-4 w-4" />
                </span>
                Ponentes
              </h2>
              <Link href={`${base}/speakers`} className="text-sm font-bold text-primary dark:text-[#a99dff]">
                Gestionar
              </Link>
            </div>
            {detalle.ponentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay ponentes.</p>
            ) : (
              <ul className="space-y-1">
                {detalle.ponentes.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted">
                    <AvatarPonente nombre={p.nombre} fotoUrl={p.foto_url} className="h-10 w-10 rounded-xl text-xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-card-foreground">{p.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.cargo, p.empresa].filter(Boolean).join(' · ')}
                        {p.pais ? ` · ${bandera(p.pais_codigo)} ${p.pais}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
                {detalle.ponentes.length > 8 && (
                  <li className="px-2 pt-1 text-xs font-semibold text-muted-foreground">y {detalle.ponentes.length - 8} más…</li>
                )}
              </ul>
            )}
          </section>

          {/* ---------- Sponsors ---------- */}
          {detalle.sponsors.length > 0 && (
            <section className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                  <Handshake className="h-4 w-4" />
                </span>
                Con el apoyo de
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {detalle.sponsors.map((sp) => (
                  <div
                    key={sp.id}
                    title={sp.nombre}
                    className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-2"
                  >
                    {sp.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sp.logo_url} alt={sp.nombre} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-center text-[11px] font-bold text-slate-700">{sp.nombre}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <PanelLateral abierto={editando} titulo="Editar congreso" subtitulo={detalle.nombre} alCerrar={() => setEditando(false)}>
        {editando && (
          <EditarCongreso
            congreso={detalle}
            totalSesiones={detalle.sesiones.length}
            alCancelar={() => setEditando(false)}
            alGuardar={() => {
              setEditando(false);
              setVersion((v) => v + 1);
            }}
          />
        )}
      </PanelLateral>
    </div>
  );
}

/** Cifra blanca sobre la portada ("16 sesiones"). */
function Dato({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
      <span className="block font-heading text-xl leading-none font-bold">{valor}</span>
      <span className="text-xs text-white/85">{texto}</span>
    </div>
  );
}

/** Un renglón del adelanto: hora, punto de color y la charla (o pausa). */
function FilaAdelanto({ sesion, zona }: { sesion: Sesion; zona: string }) {
  const esBreak = sesion.tipo === 'break';
  const almuerzo = esBreak && /almuerzo|comida|cena/i.test(sesion.titulo);
  const vivo = enVivo(sesion.inicio, sesion.fin);
  const { semana, dia } = etiquetaDia(diaEnZona(sesion.inicio, zona));
  const ponentes = sesion.ponentes?.map((x) => x.ponente.nombre).join(', ');

  const contenido = (
    <>
      <div className="w-[76px] shrink-0 text-right">
        <p className="font-heading text-[15px] font-bold text-foreground">{horaEnZona(sesion.inicio, zona)}</p>
        <p className="text-[11px] whitespace-nowrap text-muted-foreground">
          {semana.slice(0, 3).toLowerCase()} {dia.replace(' de ', ' ')}
        </p>
      </div>
      <span
        className={cn(
          'h-10 w-1 shrink-0 rounded-full',
          esBreak ? (almuerzo ? 'bg-green-500' : 'bg-amber-500') : sesion.tipo === 'plenaria' || vivo ? 'bg-coral' : 'bg-primary',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-bold', esBreak ? (almuerzo ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300') : 'text-card-foreground')}>
          {esBreak && (almuerzo ? <UtensilsCrossed className="mr-1.5 inline h-3.5 w-3.5" /> : <Coffee className="mr-1.5 inline h-3.5 w-3.5" />)}
          {sesion.titulo}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[sesion.sala, ponentes].filter(Boolean).join(' · ') || (esBreak ? 'Pausa' : 'Sin ponente asignado')}
        </p>
      </div>
      {vivo && <span className="rounded-full bg-coral px-2 py-0.5 text-[10.5px] font-bold text-coral-foreground">EN VIVO</span>}
      {(sesion._count?.favoritas ?? 0) > 0 && (
        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <Star className="h-3 w-3 fill-current" /> {sesion._count!.favoritas}
        </span>
      )}
      {!esBreak && <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-label="Moderar en vivo" />}
    </>
  );

  return (
    <li>
      {esBreak ? (
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl border border-dashed px-3 py-2.5',
            almuerzo ? 'border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10' : 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
          )}
        >
          {contenido}
        </div>
      ) : (
        <Link
          href={`/sesiones/${sesion.id}`}
          title="Abrir la moderación en vivo"
          className="group flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary/5"
        >
          {contenido}
        </Link>
      )}
    </li>
  );
}
