'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Handshake,
  ImageUp,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiFetch, apiSubirArchivo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogoConfirmar } from '@/components/panel/dialogo-confirmar';
import { MenuAcciones } from '@/components/panel/menu-acciones';
import { PanelLateral } from '@/components/panel/panel-lateral';
import { cn } from '@/lib/utils';

type Sponsor = {
  id: string;
  nombre: string;
  logo_url: string | null;
  sitio_web: string | null;
  nivel: string;
  orden: number;
};

/** Los niveles en el orden en que se muestran (igual que NIVELES_SPONSOR del backend). */
const NIVELES = [
  { valor: 'oro', texto: 'Oro', clase: 'bg-amber-400/15 text-amber-600 dark:text-amber-400' },
  { valor: 'plata', texto: 'Plata', clase: 'bg-slate-400/15 text-slate-600 dark:text-slate-300' },
  { valor: 'bronce', texto: 'Bronce', clase: 'bg-orange-700/15 text-orange-700 dark:text-orange-400' },
  { valor: 'general', texto: 'General', clase: 'bg-primary/10 text-primary' },
] as const;

/** "https://www.empresa.com/" -> "empresa.com" (para mostrar, no para guardar). */
function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * SPONSORS de un congreso (Bloque 8.5.b).
 *
 * Agrupados por nivel (Oro, Plata, Bronce, General). Dentro de cada nivel el
 * orden se cambia con las flechas ↑↓: el panel manda el nivel completo en el
 * orden nuevo a /sponsors/orden, en una sola llamada.
 *
 * El logo vive en Supabase Storage (mismo StorageService que la foto de los
 * ponentes). Se muestra sobre un recuadro BLANCO también en modo oscuro: casi
 * todos los logos están diseñados para fondo blanco.
 */
export default function SponsorsCongresoPage() {
  const { id: congresoId } = useParams<{ id: string }>();

  const [nombreCongreso, setNombreCongreso] = useState('');
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enFormulario, setEnFormulario] = useState<Sponsor | 'nuevo' | null>(null);
  const [aBorrar, setABorrar] = useState<Sponsor | null>(null);
  const [moviendo, setMoviendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [congreso, lista] = await Promise.all([
        apiFetch<{ nombre: string }>('GET', `/congresos/${congresoId}`),
        apiFetch<Sponsor[]>('GET', `/congresos/${congresoId}/sponsors`),
      ]);
      setNombreCongreso(congreso.nombre);
      setSponsors(lista);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar los sponsors');
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Sube o baja un sponsor dentro de su nivel. */
  async function mover(s: Sponsor, direccion: -1 | 1) {
    const delNivel = sponsors.filter((x) => x.nivel === s.nivel);
    const i = delNivel.findIndex((x) => x.id === s.id);
    const j = i + direccion;
    if (j < 0 || j >= delNivel.length) return;
    const ids = delNivel.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]]; // intercambiar los dos vecinos
    setMoviendo(true);
    try {
      setSponsors(await apiFetch<Sponsor[]>('POST', `/congresos/${congresoId}/sponsors/orden`, { ids }));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo reordenar');
    } finally {
      setMoviendo(false);
    }
  }

  async function borrar() {
    const victima = aBorrar;
    setABorrar(null);
    if (!victima) return;
    try {
      await apiFetch('DELETE', `/sponsors/${victima.id}`);
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo borrar');
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <Link
        href={`/congresos/${congresoId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al congreso
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
            Sponsors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {nombreCongreso && `${nombreCongreso} · `}
            {sponsors.length} patrocinador{sponsors.length === 1 ? '' : 'es'}
          </p>
        </div>
        <Button size="sm" onClick={() => setEnFormulario('nuevo')}>
          <Plus /> Nuevo sponsor
        </Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {cargando && <p className="text-muted-foreground">Cargando…</p>}

      {!cargando && sponsors.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Handshake className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Todavía no hay sponsors en este congreso.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aparecerán en la app, en la franja «Con el apoyo de» del congreso.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {NIVELES.map((nivel) => {
          const delNivel = sponsors.filter((s) => s.nivel === nivel.valor);
          if (delNivel.length === 0) return null;
          return (
            <section key={nivel.valor}>
              <h2 className="mb-3 flex items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide', nivel.clase)}>
                  {nivel.texto}
                </span>
                <span className="text-sm text-muted-foreground">{delNivel.length}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {delNivel.map((s, i) => (
                  <li
                    key={s.id}
                    onClick={() => setEnFormulario(s)}
                    className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40"
                  >
                    <LogoSponsor nombre={s.nombre} url={s.logo_url} className="h-24 w-full" />
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-card-foreground">{s.nombre}</p>
                        {s.sitio_web ? (
                          <a
                            href={s.sitio_web}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {dominio(s.sitio_web)} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin sitio web</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                        <BotonFlecha
                          titulo="Subir"
                          deshabilitado={i === 0 || moviendo}
                          alHacer={() => mover(s, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </BotonFlecha>
                        <BotonFlecha
                          titulo="Bajar"
                          deshabilitado={i === delNivel.length - 1 || moviendo}
                          alHacer={() => mover(s, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </BotonFlecha>
                        <MenuAcciones
                          etiqueta={`Acciones de ${s.nombre}`}
                          acciones={[
                            { texto: 'Editar', Icono: Pencil, alHacer: () => setEnFormulario(s) },
                            { texto: 'Borrar', Icono: Trash2, peligroso: true, alHacer: () => setABorrar(s) },
                          ]}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <PanelLateral
        abierto={enFormulario !== null}
        titulo={enFormulario === 'nuevo' ? 'Nuevo sponsor' : 'Editar sponsor'}
        subtitulo={nombreCongreso}
        alCerrar={() => setEnFormulario(null)}
      >
        {enFormulario !== null && (
          <FormularioSponsor
            key={enFormulario === 'nuevo' ? 'nuevo' : enFormulario.id}
            congresoId={congresoId}
            sponsor={enFormulario === 'nuevo' ? null : enFormulario}
            alGuardar={async () => { setEnFormulario(null); await cargar(); }}
            alCancelar={() => setEnFormulario(null)}
          />
        )}
      </PanelLateral>

      <DialogoConfirmar
        abierto={aBorrar !== null}
        titulo={`¿Borrar a ${aBorrar?.nombre}?`}
        mensaje="Dejará de aparecer en la app. Se borra también su logo. Esta acción no se puede deshacer."
        textoConfirmar="Borrar"
        peligroso
        alConfirmar={borrar}
        alCancelar={() => setABorrar(null)}
      />
    </div>
  );
}

/** Logo sobre fondo blanco (o las iniciales si todavía no tiene). */
function LogoSponsor({ nombre, url, className }: { nombre: string; url: string | null; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-3', className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={nombre} className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-slate-400">
          {nombre.slice(0, 2).toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}

function BotonFlecha({
  titulo,
  deshabilitado,
  alHacer,
  children,
}: {
  titulo: string;
  deshabilitado: boolean;
  alHacer: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={deshabilitado}
      onClick={alHacer}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/**
 * Formulario de crear/editar. Mismo patrón que el de Speakers (8.4): el logo se
 * sube al GUARDAR (así "Cancelar" no cambia nada) y, si al crear falla el logo,
 * el siguiente intento edita el sponsor ya creado en vez de duplicarlo.
 */
function FormularioSponsor({
  congresoId,
  sponsor,
  alGuardar,
  alCancelar,
}: {
  congresoId: string;
  sponsor: Sponsor | null;
  alGuardar: () => Promise<void>;
  alCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombre: sponsor?.nombre ?? '',
    nivel: sponsor?.nivel ?? 'general',
    sitio_web: sponsor?.sitio_web ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [quitarLogo, setQuitarLogo] = useState(false);
  const [idCreado, setIdCreado] = useState<string | null>(null);

  useEffect(() => () => { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); }, [vistaPrevia]);

  function elegirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('El logo debe ser JPG, PNG o WebP (mejor PNG con fondo transparente)');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('El logo pesa más de 2 MB. Prueba con uno más liviano.');
      return;
    }
    setError(null);
    setArchivo(f);
    setQuitarLogo(false);
    setVistaPrevia(URL.createObjectURL(f));
  }

  const logoVisible = vistaPrevia ?? (quitarLogo ? null : sponsor?.logo_url ?? null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const datos = {
      nombre: form.nombre.trim(),
      nivel: form.nivel,
      // Vacío = quitar el sitio. El backend le agrega https:// si falta.
      sitio_web: form.sitio_web.trim() || null,
    };
    try {
      let id = sponsor?.id ?? idCreado;
      if (id) {
        await apiFetch('PATCH', `/sponsors/${id}`, datos);
      } else {
        const creado = await apiFetch<{ id: string }>('POST', `/congresos/${congresoId}/sponsors`, datos);
        id = creado.id;
        setIdCreado(creado.id);
      }
      if (archivo) {
        await apiSubirArchivo(`/sponsors/${id}/logo`, archivo);
      } else if (quitarLogo && sponsor?.logo_url) {
        await apiFetch('DELETE', `/sponsors/${id}/logo`);
      }
      await alGuardar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-2">
        <Label>Logo</Label>
        <LogoSponsor nombre={form.nombre || '?'} url={logoVisible} className="h-32 w-full" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <ImageUp className="h-4 w-4" />
            {logoVisible ? 'Cambiar logo' : 'Subir logo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={elegirLogo} className="hidden" />
          </label>
          {logoVisible && (
            <button
              type="button"
              onClick={() => { setArchivo(null); setVistaPrevia(null); setQuitarLogo(true); }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Quitar
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG con fondo transparente se ve mejor. JPG o WebP también sirven. Máximo 2 MB.
          {archivo && ' Se guardará al pulsar Guardar.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sponsor-nombre">Nombre</Label>
        <Input
          id="sponsor-nombre"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          required
          maxLength={120}
          placeholder="Laboratorios Andinos"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Nivel</Label>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {NIVELES.map((n) => (
            <button
              key={n.valor}
              type="button"
              onClick={() => setForm((f) => ({ ...f, nivel: n.valor }))}
              className={cn(
                'rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                form.nivel === n.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {n.texto}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Define el orden y el tamaño del logo en la app: Oro va primero y más grande.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sponsor-web">Sitio web (opcional)</Label>
        <Input
          id="sponsor-web"
          value={form.sitio_web}
          onChange={(e) => setForm((f) => ({ ...f, sitio_web: e.target.value }))}
          maxLength={300}
          placeholder="www.empresa.com"
        />
        <p className="text-xs text-muted-foreground">En la app, el asistente podrá abrirlo desde la ficha del sponsor.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : sponsor ? 'Guardar cambios' : 'Crear sponsor'}
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
