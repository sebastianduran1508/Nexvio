'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePanel } from '@/components/panel/panel-contexto';
import { buttonVariants } from '@/components/ui/button';
import { EncabezadoPagina, EsqueletoPagina } from '@/components/panel/encabezado-pagina';
import { TarjetaCongreso, TarjetaCrear } from '@/components/panel/tarjeta-congreso';

type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  ciudad?: string | null;
  // 8.7.h: para la tarjeta (portada con sus colores, logo y conteos)
  personalizacion?: { logo_url: string | null; color_primario: string | null; color_secundario: string | null } | null;
  _count?: { sesiones: number; inscripciones: number };
};

/**
 * Lista de congresos del tenant ACTIVO.
 *
 * Para un organizador, el tenant es su organización (viene en el token).
 * Para el superadmin, es la que eligió en el selector de la cabecera: apiFetch
 * manda la cabecera X-Organizacion-Id y el backend hace el resto. Fíjate en que
 * esta pantalla NO sabe nada de eso — pide "los congresos" y ya.
 *
 * 8.7.h: tarjetas en cuadrícula con la portada de cada congreso.
 */
export default function CongresosPage() {
  const { esSuperadmin, orgActual, perfil } = usePanel();
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCongresos(await apiFetch<Congreso[]>('GET', '/congresos'));
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar los congresos');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) return <EsqueletoPagina />;

  const org = esSuperadmin ? orgActual?.nombre : perfil?.organizacion?.nombre;

  return (
    <div className="contenido-panel">
      <EncabezadoPagina
        Icono={CalendarDays}
        migas={org ? [{ texto: org }, { texto: 'Congresos' }] : undefined}
        titulo="Congresos"
        subtitulo={`${congresos.length} congreso${congresos.length === 1 ? '' : 's'} en esta organización`}
        acciones={
          <Link href="/congresos/nuevo" className={buttonVariants({ className: 'h-10 rounded-xl px-4 font-bold shadow-[0_8px_20px_rgba(90,70,240,0.3)]' })}>
            <Plus /> Nuevo congreso
          </Link>
        }
      />

      {error && <p className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {!error && (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4">
          {congresos.map((c) => (
            <li key={c.id}>
              <TarjetaCongreso
                id={c.id}
                nombre={c.nombre}
                fechaInicio={c.fecha_inicio}
                fechaFin={c.fecha_fin}
                ciudad={c.ciudad}
                estado={c.estado}
                sesiones={c._count?.sesiones}
                inscritos={c._count?.inscripciones}
                colores={[c.personalizacion?.color_primario, c.personalizacion?.color_secundario]}
                logoUrl={c.personalizacion?.logo_url}
                href={`/congresos/${c.id}`}
              />
            </li>
          ))}
          <li>
            <TarjetaCrear
              href="/congresos/nuevo"
              titulo={congresos.length === 0 ? 'Crea tu primer congreso' : 'Crear un congreso'}
              sub="Fechas, sede y zona horaria"
            />
          </li>
        </ul>
      )}
    </div>
  );
}
