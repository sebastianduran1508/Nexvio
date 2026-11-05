'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { EncabezadoPagina, EsqueletoPagina } from './encabezado-pagina';
import { TarjetaCongreso } from './tarjeta-congreso';

type Congreso = {
  id: string;
  nombre: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  ciudad?: string | null;
  personalizacion?: { logo_url: string | null; color_primario: string | null; color_secundario: string | null } | null;
  _count?: { sesiones: number; inscripciones: number };
};

/**
 * "¿En qué congreso quieres trabajar?" — la puerta de entrada de las secciones
 * del menú que viven DENTRO de un congreso (Usuarios, Agenda, Speakers...).
 *
 * Los datos son por congreso, así que primero hay que elegir uno. Si la
 * organización tiene un solo congreso, entra directo sin preguntar.
 *
 * `seccion` es el final de la ruta: 'speakers' lleva a /congresos/:id/speakers.
 * 8.7.h: las mismas tarjetas con portada que la lista de Congresos, en
 * cuadrícula (antes era una columna angosta en medio de la pantalla).
 */
export function ElegirCongreso({
  titulo,
  descripcion,
  seccion,
  Icono,
}: {
  titulo: string;
  descripcion: string;
  seccion: string;
  Icono: React.ComponentType<{ className?: string }>;
}) {
  const router = useRouter();
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const lista = await apiFetch<Congreso[]>('GET', '/congresos');
        if (lista.length === 1) {
          router.replace(`/congresos/${lista[0].id}/${seccion}`);
          return;
        }
        setCongresos(lista);
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar los congresos');
      } finally {
        setCargando(false);
      }
    })();
  }, [router, seccion]);

  if (cargando) return <EsqueletoPagina />;

  return (
    <div className="contenido-panel">
      <EncabezadoPagina Icono={Icono} titulo={titulo} subtitulo={descripcion} />

      {error && <p className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {!error && congresos.length === 0 && (
        <p className="rounded-[22px] border-2 border-dashed border-primary/20 bg-card/60 p-12 text-center font-semibold text-foreground">
          Esta organización todavía no tiene congresos.
        </p>
      )}

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
              href={`/congresos/${c.id}/${seccion}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
