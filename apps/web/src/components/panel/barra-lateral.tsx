'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  CalendarDays,
  Globe2,
  LayoutDashboard,
  Building2,
  Users,
  Mic2,
  Handshake,
  Bell,
  HelpCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NexvioMark } from '@/components/logo';
import { usePanel } from './panel-contexto';
import { cn } from '@/lib/utils';

type Entrada = {
  href: string;
  texto: string;
  Icono: React.ComponentType<{ className?: string }>;
};

/** Secciones que viven dentro de un congreso y la entrada del menú que les toca. */
const SECCIONES_DE_CONGRESO: Record<string, string> = {
  agenda: '/agenda',
  speakers: '/speakers',
  sponsors: '/sponsors',
  notificaciones: '/notificaciones',
  asistentes: '/usuarios',
};

/** /congresos/abc/agenda -> /agenda · cualquier otra ruta se queda igual. */
function seccionDelMenu(ruta: string): string {
  const m = ruta.match(/^\/congresos\/[^/]+\/([^/]+)/);
  return (m && SECCIONES_DE_CONGRESO[m[1]]) || ruta;
}

/** Menú del superadmin: lo que vive POR ENCIMA de las organizaciones. */
const MENU_SUPERADMIN: Entrada[] = [
  { href: '/superadmin', texto: 'Panorama', Icono: Globe2 },
  { href: '/superadmin/organizaciones', texto: 'Organizaciones', Icono: Building2 },
];

/** Menú del congreso: lo mismo para el organizador y para el superadmin
 *  cuando está trabajando dentro de una organización. */
const MENU_CONGRESO: Entrada[] = [
  { href: '/congresos', texto: 'Congresos', Icono: CalendarDays },
  { href: '/usuarios', texto: 'Usuarios', Icono: Users },
  { href: '/agenda', texto: 'Agenda', Icono: LayoutDashboard },
  { href: '/speakers', texto: 'Speakers', Icono: Mic2 },
  { href: '/sponsors', texto: 'Sponsors', Icono: Handshake },
  { href: '/notificaciones', texto: 'Notificaciones', Icono: Bell },
  // 8.7.c2: Ley 1581 (solicitudes de los asistentes + datos del responsable).
  { href: '/privacidad', texto: 'Privacidad', Icono: ShieldCheck },
  { href: '/ayuda', texto: 'Ayuda', Icono: HelpCircle },
];

const NOMBRE_ROL: Record<string, string> = {
  admin: 'Superadmin',
  organizador: 'Organizador',
  coordinador: 'Coordinador',
};

/**
 * Menú lateral del panel (8.7.h: rediseño "Violeta vivo").
 *
 * Va SIEMPRE en el degradado violeta de la marca, en claro y en oscuro: lo
 * que cambia con el tema es solo el contenido. Cada opción va dentro de su
 * cajita translúcida para que se lea bien sobre el violeta, y la activa es
 * una pastilla blanca.
 *
 * En pantallas grandes está fija a la izquierda; en el celular se abre como
 * cajón desde el botón ☰ de la barra superior (`abierto` / `alCerrar`).
 */
export function BarraLateral({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const ruta = usePathname();
  const { esSuperadmin, claims, perfil } = usePanel();

  // Al navegar (en el celular), el cajón se cierra solo.
  useEffect(() => {
    alCerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta]);

  // Cuál entrada se pinta como activa: la coincidencia MÁS LARGA (la más
  // específica), traduciendo antes las secciones que viven dentro de un
  // congreso (/congresos/:id/agenda -> /agenda).
  const rutaMenu = seccionDelMenu(ruta);
  const activaHref = [...MENU_SUPERADMIN, ...MENU_CONGRESO]
    .map((e) => e.href)
    .filter((href) => rutaMenu === href || rutaMenu.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0];

  const nombre = perfil ? [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ') : claims?.email ?? '';
  const iniciales = (perfil ? `${perfil.nombre?.[0] ?? ''}${perfil.apellidos?.[0] ?? ''}` : claims?.email?.[0] ?? '?').toUpperCase();
  const rol = NOMBRE_ROL[claims?.rol ?? ''] ?? claims?.rol ?? '';

  const contenido = (
    <div className="fondo-marca-lateral flex h-full w-64 flex-col gap-5 px-3.5 py-5 text-white">
      <div className="flex items-center justify-between px-2">
        <Link href={esSuperadmin ? '/superadmin' : '/congresos'} aria-label="Nexvio, inicio" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_6px_18px_rgba(20,8,80,0.35)]">
            <NexvioMark className="h-7 w-7" />
          </span>
          <span className="font-heading text-[22px] font-bold tracking-tight">Nexvio</span>
        </Link>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar menú"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="Menú principal" className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1">
        {esSuperadmin && <Seccion titulo="Superadmin" entradas={MENU_SUPERADMIN} activaHref={activaHref} />}
        <Seccion titulo="Congreso" entradas={MENU_CONGRESO} activaHref={activaHref} />
      </nav>

      <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff7a59,#ffb199)] font-heading text-[13px] font-bold text-[#3a1206]">
          {iniciales}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">{nombre}</span>
          <span className="block text-[11.5px] text-white/75">{rol}</span>
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Escritorio: fija */}
      <aside className="hidden shrink-0 md:flex">{contenido}</aside>

      {/* Celular: cajón */}
      {abierto && (
        <div className="fixed inset-0 z-[80] flex md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="h-full shadow-2xl">{contenido}</div>
          <button type="button" aria-label="Cerrar menú" className="flex-1 bg-black/45" onClick={alCerrar} />
        </div>
      )}
    </>
  );
}

function Seccion({
  titulo,
  entradas,
  activaHref,
}: {
  titulo: string;
  entradas: Entrada[];
  activaHref?: string;
}) {
  return (
    <div>
      <p className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/65">{titulo}</p>
      <ul className="space-y-1.5">
        {entradas.map(({ href, texto, Icono }) => {
          const activa = href === activaHref;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  activa
                    ? 'bg-white font-bold text-[#4a35d6] shadow-[0_8px_20px_rgba(20,8,80,0.28)]'
                    : 'border border-white/[0.08] bg-white/[0.07] font-medium text-white/90 hover:bg-white/[0.16] hover:text-white',
                )}
              >
                <Icono className="h-[18px] w-[18px]" />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
