'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { usePanel } from './panel-contexto';
import { cn } from '@/lib/utils';

type Entrada = {
  href: string;
  texto: string;
  Icono: React.ComponentType<{ className?: string }>;
  /** Si está, la entrada aún no se ha construido (bloques 8.3–8.6). */
  proximamente?: boolean;
};

/** Secciones que viven dentro de un congreso y la entrada del menú que les toca. */
const SECCIONES_DE_CONGRESO: Record<string, string> = {
  agenda: '/agenda',
  speakers: '/speakers',
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
  { href: '/sponsors', texto: 'Sponsors', Icono: Handshake, proximamente: true },
  { href: '/notificaciones', texto: 'Notificaciones', Icono: Bell, proximamente: true },
  { href: '/ayuda', texto: 'Ayuda', Icono: HelpCircle, proximamente: true },
];

/**
 * Menú lateral del panel. Es el esqueleto sobre el que se irán colgando las
 * pantallas de los bloques 8.3 a 8.6: las entradas ya están puestas y marcadas
 * como "pronto" para que se vea hacia dónde va el panel.
 */
export function BarraLateral() {
  const ruta = usePathname();
  const { esSuperadmin } = usePanel();

  // Cuál entrada se pinta como activa.
  //
  // El problema que resuelve: estando en /superadmin/organizaciones, la entrada
  // "Panorama" (/superadmin) TAMBIÉN encaja, porque una es prefijo de la otra,
  // y se veían las dos resaltadas. La regla correcta es quedarse con la
  // coincidencia MÁS LARGA — la más específica —, y así funciona sola para
  // cualquier ruta anidada que agreguemos en los bloques siguientes.
  //
  // Segundo detalle (8.4): Agenda, Speakers y Asistentes viven DENTRO de un
  // congreso (/congresos/:id/agenda...). Por su ruta encajarían en
  // "Congresos", pero el admin llegó desde su propia entrada del menú, así
  // que se traducen a esa entrada antes de comparar.
  const rutaMenu = seccionDelMenu(ruta);
  const activaHref = [...MENU_SUPERADMIN, ...MENU_CONGRESO]
    .filter((e) => !e.proximamente)
    .map((e) => e.href)
    .filter((href) => rutaMenu === href || rutaMenu.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/congresos" aria-label="Nexvio">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {esSuperadmin && (
          <Seccion
            titulo="Superadmin"
            entradas={MENU_SUPERADMIN}
            activaHref={activaHref}
          />
        )}
        <Seccion
          titulo="Congreso"
          entradas={MENU_CONGRESO}
          activaHref={activaHref}
        />
      </nav>
    </aside>
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
    <div className="mb-5">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <ul className="space-y-0.5">
        {entradas.map(({ href, texto, Icono, proximamente }) => {
          const activa = href === activaHref;

          if (proximamente) {
            return (
              <li key={href}>
                <span className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/60">
                  <Icono className="h-4 w-4" />
                  <span className="flex-1">{texto}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    pronto
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  activa
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-card-foreground hover:bg-muted',
                )}
              >
                <Icono className="h-4 w-4" />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
