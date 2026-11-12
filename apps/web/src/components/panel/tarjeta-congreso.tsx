import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Portadas de reserva (cuando el congreso no tiene colores propios). */
const PORTADAS: [string, string][] = [
  ['#1e3a8a', '#3b82f6'],
  ['#0f766e', '#2dd4bf'],
  ['#9f1239', '#fb7185'],
  ['#4c1d95', '#8b5cf6'],
  ['#9a3412', '#fb923c'],
  ['#155e75', '#22d3ee'],
];

/** Siempre el mismo par para el mismo congreso (no "salta" al recargar). */
function portadaPorId(id: string): [string, string] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PORTADAS[h % PORTADAS.length];
}

/** "Congreso Nacional de Cardiología" -> "CN" */
export function sigla(nombre: string) {
  const palabras = nombre.split(/\s+/).filter((p) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(p) && p.length > 2);
  return ((palabras[0]?.[0] ?? nombre[0] ?? '?') + (palabras[1]?.[0] ?? '')).toUpperCase();
}

/** "12 – 13 nov 2026" / "11 nov 2026" / "30 nov – 2 dic 2026" */
export function rangoCorto(inicio?: string, fin?: string) {
  if (!inicio) return '';
  const a = new Date(inicio);
  const b = new Date(fin ?? inicio);
  const dia = (d: Date) => d.getUTCDate();
  const mes = (d: Date) => d.toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  const anio = b.getUTCFullYear();
  if (a.getTime() === b.getTime()) return `${dia(a)} ${mes(a)} ${anio}`;
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear())
    return `${dia(a)} – ${dia(b)} ${mes(b)} ${anio}`;
  return `${dia(a)} ${mes(a)} – ${dia(b)} ${mes(b)} ${anio}`;
}

const ESTADOS: Record<string, string> = {
  publicado: 'bg-green-100 text-green-900 dark:bg-green-500/90 dark:text-green-950',
  borrador: 'bg-amber-100 text-amber-900 dark:bg-amber-500/90 dark:text-amber-950',
  finalizado: 'bg-slate-200 text-slate-800 dark:bg-slate-400/90 dark:text-slate-950',
};

/**
 * Tarjeta de un congreso (8.7.h): portada en degradado con su logo, estado,
 * fechas, conteos y "Entrar". La usan Congresos y el Panorama del superadmin.
 * `href` la vuelve un enlace; `alEntrar` un botón (el Panorama cambia de
 * organización antes de entrar).
 */
export function TarjetaCongreso({
  id,
  nombre,
  organizacion,
  fechaInicio,
  fechaFin,
  ciudad,
  estado,
  enCurso,
  sesiones,
  inscritos,
  colores,
  logoUrl,
  href,
  alEntrar,
}: {
  id: string;
  nombre: string;
  organizacion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  ciudad?: string | null;
  estado?: string;
  enCurso?: boolean;
  sesiones?: number;
  inscritos?: number;
  colores?: [string | null | undefined, string | null | undefined];
  logoUrl?: string | null;
  href?: string;
  alEntrar?: () => void;
}) {
  const [a, b] = colores?.[0] ? [colores[0], colores[1] || colores[0]] : portadaPorId(id);
  const claseEstado = ESTADOS[estado ?? ''] ?? ESTADOS.finalizado;

  const cuerpo = (
    <>
      <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)` }}>
        <span className="absolute -top-10 -right-8 h-36 w-36 rounded-full bg-white/15" />
        <span className="absolute -bottom-16 left-[40%] h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute top-3 right-3 flex gap-1.5">
          {enCurso && (
            <span className="flex items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold text-coral-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-foreground" /> EN CURSO
            </span>
          )}
          {estado && (
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase', claseEstado)}>{estado}</span>
          )}
        </div>
      </div>
      <span
        className="absolute top-[86px] left-4 flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-2xl border-[3px] border-card bg-white font-heading text-[17px] font-bold shadow-[0_6px_16px_rgba(20,8,80,0.18)]"
        style={{ color: a }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          sigla(nombre)
        )}
      </span>
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] pt-9 pb-[18px] text-left">
        <h3 className="text-[16.5px] leading-snug font-bold text-card-foreground">{nombre}</h3>
        {organizacion && <p className="text-[13px] text-muted-foreground">{organizacion}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          {fechaInicio && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {rangoCorto(fechaInicio, fechaFin)}
            </span>
          )}
          {ciudad && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {ciudad}
            </span>
          )}
        </p>
        {(sesiones !== undefined || inscritos !== undefined) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {sesiones !== undefined && (
              <span className="rounded-[10px] bg-muted px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground">{sesiones} charla{sesiones === 1 ? '' : 's'}</span>
            )}
            {inscritos !== undefined && (
              <span className="rounded-[10px] bg-muted px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground">{inscritos} inscritos</span>
            )}
          </div>
        )}
        <span className="mt-auto flex items-center justify-end gap-1.5 pt-3.5 text-[13.5px] font-bold text-primary dark:text-[#a99dff]">
          Entrar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </>
  );

  const clase =
    'group relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary';

  return href ? (
    <Link href={href} className={clase}>
      {cuerpo}
    </Link>
  ) : (
    <button type="button" onClick={alEntrar} className={clase}>
      {cuerpo}
    </button>
  );
}

/** La tarjeta punteada de "crear uno nuevo" que cierra la cuadrícula. */
export function TarjetaCrear({ href, titulo, sub }: { href: string; titulo: string; sub?: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[280px] flex-col items-center justify-center gap-2.5 rounded-[22px] border-2 border-dashed border-primary/25 bg-primary/[0.03] text-primary transition hover:border-primary/50 hover:bg-primary/[0.06] dark:text-[#a99dff]"
    >
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary/10">
        <span className="text-2xl leading-none font-bold">+</span>
      </span>
      <span className="text-[15px] font-bold">{titulo}</span>
      {sub && <span className="text-[13px] text-muted-foreground">{sub}</span>}
    </Link>
  );
}
