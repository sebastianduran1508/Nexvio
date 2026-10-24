'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  Coffee,
  MapPin,
  MessageSquare,
  Mic2,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Ponente = {
  id: string;
  nombre: string;
  bio?: string | null;
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
};
type CongresoDetalle = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  descripcion?: string | null;
  ciudad?: string | null;
  lugar?: string | null;
  sesiones: Sesion[];
  ponentes: Ponente[];
};

// ---------------------------------------------------------------------------
// Formatos (mismas reglas que la app móvil)
// ---------------------------------------------------------------------------

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/** Las fechas del congreso llegan a medianoche UTC: se leen en UTC para no
 *  mostrar el día anterior. */
function fechaCongreso(iso: string) {
  return new Date(iso)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace(/\./g, '');
}

/** "2026-10-24" en hora local, para agrupar la agenda por día. */
function claveDia(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function etiquetaDia(clave: string) {
  const [y, m, d] = clave.split('-').map(Number);
  const f = new Date(y, m - 1, d, 12);
  const semana = f.toLocaleDateString('es-CO', { weekday: 'long' });
  const dia = f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace(/\./g, '');
  return { semana: semana.charAt(0).toUpperCase() + semana.slice(1), dia };
}

function enVivo(ini: string, fin: string) {
  const ahora = Date.now();
  return new Date(ini).getTime() <= ahora && ahora < new Date(fin).getTime();
}

function iniciales(nombre: string) {
  const partes = nombre.replace(/^(dr|dra)\.?\s+/i, '').trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

function bandera(codigo?: string | null) {
  if (!codigo || codigo.length !== 2) return '';
  const base = 0x1f1e6 - 65;
  const c = codigo.toUpperCase();
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}

/**
 * Detalle de un congreso en el panel.
 *
 * Muestra lo mismo que ve el asistente en la app (para que en una demo se vean
 * "las dos caras" del mismo dato): datos del evento, AGENDA POR DÍA con charlas,
 * talleres y breaks, y la ficha de los ponentes. Cada charla lleva a la pantalla
 * de moderación en vivo (preguntas y encuestas).
 *
 * La gestión completa de agenda y ponentes (crear, editar, asignar) es el
 * Bloque 8.4; esta pantalla es de solo lectura.
 */
export default function CongresoDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);

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

  const dias = useMemo(() => {
    const grupos = new Map<string, Sesion[]>();
    for (const s of detalle?.sesiones ?? []) {
      const k = claveDia(s.inicio);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(s);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [detalle]);

  if (error) return <p className="p-8 text-destructive">{error}</p>;
  if (!detalle) return <p className="p-8 text-muted-foreground">Cargando…</p>;

  const hoy = claveDia(new Date().toISOString());
  const diaActivo =
    (diaElegido && dias.find(([k]) => k === diaElegido)?.[0]) ??
    dias.find(([k]) => k === hoy)?.[0] ??
    dias[0]?.[0];
  const sesionesDelDia = dias.find(([k]) => k === diaActivo)?.[1] ?? [];
  const totalCharlas = detalle.sesiones.filter((s) => s.tipo !== 'break').length;

  return (
    <div className="mx-auto w-full max-w-5xl p-8">
      <Link href="/congresos" className="text-sm text-primary">
        ‹ Congresos
      </Link>

      {/* ---------- Encabezado ---------- */}
      <div className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#5A46F0] to-[#7C3AED] p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              {detalle.estado}
            </span>
            <h1 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight md:text-3xl">
              {detalle.nombre}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
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
          </div>
          <Link
            href={`/congresos/${detalle.id}/asistentes`}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#5A46F0] shadow-sm transition hover:bg-white/90"
          >
            <Users className="h-4 w-4" /> Asistentes
          </Link>
        </div>
        {detalle.descripcion && (
          <p className="relative mt-4 max-w-3xl text-sm leading-relaxed text-white/85">{detalle.descripcion}</p>
        )}
        <div className="relative mt-5 flex flex-wrap gap-3">
          <Dato valor={dias.length} texto={dias.length === 1 ? 'día' : 'días'} />
          <Dato valor={totalCharlas} texto="sesiones" />
          <Dato valor={detalle.ponentes.length} texto="ponentes" />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ---------- Agenda por día ---------- */}
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-foreground">
            Agenda
          </h2>

          {dias.length === 0 ? (
            <p className="text-muted-foreground">Este congreso aún no tiene sesiones.</p>
          ) : (
            <>
              {dias.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {dias.map(([k]) => {
                    const activo = k === diaActivo;
                    const { semana, dia } = etiquetaDia(k);
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
                        <span className="block font-[family-name:var(--font-space-grotesk)] font-semibold">{dia}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <ul className="space-y-3">
                {sesionesDelDia.map((s) => (
                  <li key={s.id}>
                    <ItemAgenda sesion={s} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------- Ponentes ---------- */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-foreground">
            <Mic2 className="h-4 w-4 text-primary" /> Ponentes
          </h2>
          {detalle.ponentes.length === 0 ? (
            <p className="text-muted-foreground">Aún no hay ponentes.</p>
          ) : (
            <ul className="space-y-3">
              {detalle.ponentes.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-primary">
                      {iniciales(p.nombre)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-card-foreground">{p.nombre}</p>
                    {(p.cargo || p.empresa) && (
                      <p className="text-xs text-muted-foreground">
                        {[p.cargo, p.empresa].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {p.pais && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {bandera(p.pais_codigo)} {p.pais}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Cifra blanca sobre el encabezado ("16 sesiones"). */
function Dato({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3.5 py-2">
      <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">{valor}</span>{' '}
      <span className="text-sm text-white/80">{texto}</span>
    </div>
  );
}

/** Un bloque de la agenda: los breaks son informativos; el resto lleva a moderar. */
function ItemAgenda({ sesion }: { sesion: Sesion }) {
  const horario = `${hora(sesion.inicio)} – ${hora(sesion.fin)}${sesion.sala ? ` · ${sesion.sala}` : ''}`;

  if (sesion.tipo === 'break') {
    const Icono = /almuerzo/i.test(sesion.titulo) ? UtensilsCrossed : Coffee;
    return (
      <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-muted-foreground">
        <Icono className="h-4 w-4" />
        <div>
          <p className="text-sm font-medium">{sesion.titulo}</p>
          <p className="text-xs">{horario}</p>
        </div>
      </div>
    );
  }

  const vivo = enVivo(sesion.inicio, sesion.fin);
  const ponentes = sesion.ponentes?.map((x) => x.ponente) ?? [];

  return (
    <Link
      href={`/sesiones/${sesion.id}`}
      className="group flex overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      <span className={cn('w-1 shrink-0', vivo ? 'bg-coral' : 'bg-primary')} />
      <div className="flex-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-primary">{horario}</span>
          {vivo ? (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> EN VIVO
            </span>
          ) : sesion.tipo === 'taller' ? (
            <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[11px] font-bold text-coral">TALLER</span>
          ) : sesion.tipo === 'plenaria' ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">PLENARIA</span>
          ) : null}
        </div>
        <p className="mt-1 font-semibold text-card-foreground">{sesion.titulo}</p>
        {ponentes.length > 0 && (
          <p className="mt-1.5 text-sm text-muted-foreground">{ponentes.map((p) => p.nombre).join(', ')}</p>
        )}
        <span className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
          <MessageSquare className="h-3.5 w-3.5" /> Moderar en vivo
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
