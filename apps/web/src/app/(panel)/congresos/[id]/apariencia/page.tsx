'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleAlert,
  ImageUp,
  MapPin,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { apiFetch, apiSubirArchivo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  PALETA_PRIMARIO,
  PALETA_SECUNDARIO,
  PRIMARIO_NEXVIO,
  SECUNDARIO_NEXVIO,
  contraste,
  esHex,
  nivelContraste,
  oscurecer,
  textoSobre,
} from '@/lib/color';

type Personalizacion = {
  logo_url: string | null;
  imagen_portada_url: string | null;
  color_primario: string | null;
  color_secundario: string | null;
};
type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  ciudad?: string | null;
  lugar?: string | null;
  personalizacion: Personalizacion | null;
  sponsors: { id: string; nombre: string; logo_url: string | null }[];
};

/** Estado de una imagen mientras se edita (se sube al GUARDAR, como siempre). */
type Imagen = { archivo: File | null; vista: string | null; quitar: boolean };
const SIN_CAMBIOS: Imagen = { archivo: null, vista: null, quitar: false };

/**
 * APARIENCIA de un congreso (Bloque 8.5.d): logo, portada y colores del evento.
 *
 * Lo que se elige aquí se ve en la app, en las pantallas DEL CONGRESO (detalle,
 * sesión, networking, chat). Login y lista siguen con la marca Nexvio (decisión
 * del 8.5, ver HANDOFF).
 *
 * A la derecha, una VISTA PREVIA del celular que cambia en vivo: el organizador
 * ve el resultado antes de guardar.
 */
export default function AparienciaPage() {
  const { id: congresoId } = useParams<{ id: string }>();

  const [congreso, setCongreso] = useState<Congreso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // null = "usar el de Nexvio".
  const [primario, setPrimario] = useState<string | null>(null);
  const [secundario, setSecundario] = useState<string | null>(null);
  const [logo, setLogo] = useState<Imagen>(SIN_CAMBIOS);
  const [portada, setPortada] = useState<Imagen>(SIN_CAMBIOS);

  const cargar = useCallback(async () => {
    try {
      const c = await apiFetch<Congreso>('GET', `/congresos/${congresoId}`);
      setCongreso(c);
      setPrimario(c.personalizacion?.color_primario ?? null);
      setSecundario(c.personalizacion?.color_secundario ?? null);
      setLogo(SIN_CAMBIOS);
      setPortada(SIN_CAMBIOS);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el congreso');
    }
  }, [congresoId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Liberar las URLs temporales de las vistas previas.
  useEffect(() => () => { if (logo.vista) URL.revokeObjectURL(logo.vista); }, [logo.vista]);
  useEffect(() => () => { if (portada.vista) URL.revokeObjectURL(portada.vista); }, [portada.vista]);

  if (!congreso) {
    return error ? <p className="p-8 text-destructive">{error}</p> : <p className="p-8 text-muted-foreground">Cargando…</p>;
  }

  const p = congreso.personalizacion;
  const logoVisible = logo.vista ?? (logo.quitar ? null : p?.logo_url ?? null);
  const portadaVisible = portada.vista ?? (portada.quitar ? null : p?.imagen_portada_url ?? null);

  const hayCambios =
    primario !== (p?.color_primario ?? null) ||
    secundario !== (p?.color_secundario ?? null) ||
    !!logo.archivo || logo.quitar || !!portada.archivo || portada.quitar;

  function elegir(e: React.ChangeEvent<HTMLInputElement>, set: (i: Imagen) => void) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('La imagen debe ser JPG, PNG o WebP');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('La imagen pesa más de 2 MB. Prueba con una más liviana.');
      return;
    }
    setError(null);
    setGuardado(false);
    set({ archivo: f, vista: URL.createObjectURL(f), quitar: false });
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      // 1) Colores (un solo PUT; el backend crea la fila si no existía).
      if (primario !== (p?.color_primario ?? null) || secundario !== (p?.color_secundario ?? null)) {
        await apiFetch('PUT', `/congresos/${congresoId}/personalizacion`, {
          color_primario: primario,
          color_secundario: secundario,
        });
      }
      // 2) Imágenes.
      for (const [cual, img, actual] of [
        ['logo', logo, p?.logo_url],
        ['portada', portada, p?.imagen_portada_url],
      ] as const) {
        if (img.archivo) {
          await apiSubirArchivo(`/congresos/${congresoId}/personalizacion/${cual}`, img.archivo);
        } else if (img.quitar && actual) {
          await apiFetch('DELETE', `/congresos/${congresoId}/personalizacion/${cual}`);
        }
      }
      await cargar();
      setGuardado(true);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  function restablecer() {
    setPrimario(null);
    setSecundario(null);
    setLogo({ ...SIN_CAMBIOS, quitar: !!p?.logo_url });
    setPortada({ ...SIN_CAMBIOS, quitar: !!p?.imagen_portada_url });
    setGuardado(false);
  }

  const colorP = primario ?? PRIMARIO_NEXVIO;
  const colorS = secundario ?? SECUNDARIO_NEXVIO;

  return (
    <div className="mx-auto w-full max-w-6xl p-6 md:p-8">
      <Link
        href={`/congresos/${congresoId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al congreso
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
            Apariencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {congreso.nombre} · así se verá el congreso en la app de los asistentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={restablecer} disabled={guardando}>
            <RotateCcw /> Usar la de Nexvio
          </Button>
          <Button size="sm" onClick={guardar} disabled={!hayCambios || guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </header>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {guardado && !hayCambios && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Guardado. Los asistentes lo verán la próxima vez que abran el congreso.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ================= Controles ================= */}
        <div className="space-y-8">
          <Bloque titulo="Logo del evento" ayuda="Se muestra en la cabecera del congreso, sobre un recuadro blanco. Mejor PNG con fondo transparente.">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2">
                {logoVisible ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoVisible} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Sin logo</span>
                )}
              </div>
              <BotonesImagen
                tiene={!!logoVisible}
                alElegir={(e) => elegir(e, setLogo)}
                alQuitar={() => { setLogo({ ...SIN_CAMBIOS, quitar: true }); setGuardado(false); }}
              />
            </div>
          </Bloque>

          <Bloque titulo="Imagen de portada" ayuda="Una foto horizontal del evento o la sede (ideal 1600 × 900). Aparece arriba en el detalle del congreso.">
            <div className="space-y-3">
              <div className="flex aspect-[16/9] max-w-md items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
                {portadaVisible ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portadaVisible} alt="Portada" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-muted-foreground">Sin portada</span>
                )}
              </div>
              <BotonesImagen
                tiene={!!portadaVisible}
                alElegir={(e) => elegir(e, setPortada)}
                alQuitar={() => { setPortada({ ...SIN_CAMBIOS, quitar: true }); setGuardado(false); }}
              />
            </div>
          </Bloque>

          <Bloque titulo="Color principal" ayuda="Cabeceras, botones y la agenda. Lleva texto blanco encima, por eso revisamos que se lea.">
            <SelectorColor
              valor={primario}
              porDefecto={PRIMARIO_NEXVIO}
              paleta={PALETA_PRIMARIO}
              alCambiar={(v) => { setPrimario(v); setGuardado(false); }}
            />
            <AvisoContraste color={colorP} />
          </Bloque>

          <Bloque titulo="Color de acento" ayuda="Etiquetas como «EN CURSO» y lo que está en vivo. El color del texto encima se elige solo.">
            <SelectorColor
              valor={secundario}
              porDefecto={SECUNDARIO_NEXVIO}
              paleta={PALETA_SECUNDARIO}
              alCambiar={(v) => { setSecundario(v); setGuardado(false); }}
            />
          </Bloque>
        </div>

        {/* ================= Vista previa ================= */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa en la app
          </p>
          <VistaPreviaCelular
            congreso={congreso}
            colorP={colorP}
            colorS={colorS}
            logo={logoVisible}
            portada={portadaVisible}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas de la pantalla
// ---------------------------------------------------------------------------

function Bloque({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-card-foreground">{titulo}</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{ayuda}</p>
      {children}
    </section>
  );
}

function BotonesImagen({
  tiene,
  alElegir,
  alQuitar,
}: {
  tiene: boolean;
  alElegir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  alQuitar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
        <ImageUp className="h-4 w-4" />
        {tiene ? 'Cambiar' : 'Subir imagen'}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={alElegir} className="hidden" />
      </label>
      {tiene && (
        <button
          type="button"
          onClick={alQuitar}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Quitar
        </button>
      )}
      <span className="text-xs text-muted-foreground">JPG, PNG o WebP · máx. 2 MB</span>
    </div>
  );
}

/**
 * Paleta sugerida + color propio. El texto hexadecimal solo se acepta cuando
 * está completo y es válido ("#1D4ED8"), para no mandar colores a medias.
 */
function SelectorColor({
  valor,
  porDefecto,
  paleta,
  alCambiar,
}: {
  valor: string | null;
  porDefecto: string;
  paleta: { nombre: string; hex: string }[];
  alCambiar: (v: string | null) => void;
}) {
  const actual = (valor ?? porDefecto).toUpperCase();
  const [texto, setTexto] = useState(actual);
  useEffect(() => setTexto(actual), [actual]);

  // Al elegir el color de Nexvio se guarda null (= "el de Nexvio"), no el hex.
  const elegir = (hex: string) => alCambiar(hex.toUpperCase() === porDefecto.toUpperCase() ? null : hex.toUpperCase());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {paleta.map((c) => {
          const activo = c.hex.toUpperCase() === actual;
          return (
            <button
              key={c.hex}
              type="button"
              title={`${c.nombre} ${c.hex}`}
              aria-label={c.nombre}
              onClick={() => elegir(c.hex)}
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110',
                activo && 'ring-2 ring-foreground',
              )}
              style={{ backgroundColor: c.hex }}
            >
              {activo && <Check className="h-4 w-4" style={{ color: textoSobre(c.hex) }} />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Color propio</Label>
        <input
          type="color"
          value={actual}
          onChange={(e) => elegir(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-1"
          aria-label="Elegir un color propio"
        />
        <Input
          value={texto}
          onChange={(e) => {
            const v = e.target.value.trim();
            setTexto(v);
            const conNumeral = v.startsWith('#') ? v : `#${v}`;
            if (esHex(conNumeral)) elegir(conNumeral);
          }}
          className="h-9 w-28 font-mono uppercase"
          maxLength={7}
          aria-label="Código del color"
        />
      </div>
    </div>
  );
}

/** El aviso de contraste del color principal (texto blanco encima). */
function AvisoContraste({ color }: { color: string }) {
  const nivel = nivelContraste(color);
  const ratio = contraste(color, '#FFFFFF').toFixed(1);
  if (nivel === 'bueno') {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
        <Check className="h-4 w-4" /> El texto blanco se lee bien ({ratio}:1)
      </p>
    );
  }
  return (
    <p
      className={cn(
        'mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm',
        nivel === 'justo'
          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      {nivel === 'justo' ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>
        {nivel === 'justo'
          ? `Contraste justo (${ratio}:1): los títulos grandes se leen, pero el texto pequeño cuesta. Prueba un tono más oscuro.`
          : `El texto blanco casi no se lee sobre este color (${ratio}:1). Elige un tono más oscuro o uno de la paleta.`}
      </span>
    </p>
  );
}

/**
 * Maqueta del detalle del congreso tal como lo verá el asistente, pintada con
 * los colores e imágenes que se están eligiendo. Es una imitación en HTML de la
 * pantalla de la app (no la app real), suficiente para decidir.
 */
function VistaPreviaCelular({
  congreso,
  colorP,
  colorS,
  logo,
  portada,
}: {
  congreso: Congreso;
  colorP: string;
  colorS: string;
  logo: string | null;
  portada: string | null;
}) {
  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/\./g, '');

  return (
    <div className="mx-auto w-[300px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
      <div className="h-[580px] overflow-hidden rounded-[1.9rem] bg-[#F5F6FA]">
        {/* Cabecera con el degradado del color principal */}
        <div
          className="relative overflow-hidden rounded-b-3xl px-4 pb-4 pt-8"
          style={{ background: `linear-gradient(135deg, ${colorP}, ${oscurecer(colorP, 0.3)})` }}
        >
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20">
              <ChevronLeft className="h-4 w-4 text-white" />
            </span>
            {logo && (
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
              </span>
            )}
            <p className="line-clamp-2 flex-1 font-[family-name:var(--font-space-grotesk)] text-[15px] font-bold leading-tight text-white">
              {congreso.nombre}
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{ backgroundColor: colorS, color: textoSobre(colorS) }}
            >
              EN CURSO
            </span>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {portada && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portada} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
          )}
          <div className="space-y-1 text-[11px] text-slate-500">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" /> {fecha(congreso.fecha_inicio)} – {fecha(congreso.fecha_fin)}
            </p>
            {(congreso.lugar || congreso.ciudad) && (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {[congreso.lugar, congreso.ciudad].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="rounded-xl py-2.5 text-center text-xs font-bold text-white" style={{ backgroundColor: colorP }}>
            Inscribirme
          </div>

          {/* Franja de sponsors (8.5.e) */}
          {congreso.sponsors.length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Con el apoyo de</p>
              <div className="flex gap-1.5 overflow-hidden">
                {congreso.sponsors.slice(0, 4).map((s) => (
                  <span key={s.id} className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white p-1">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[8px] font-bold text-slate-400">{s.nombre.slice(0, 6)}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Agenda</p>
          <div className="flex gap-1.5">
            <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: colorP }}>
              Día 1
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">Día 2</span>
          </div>
          {[
            { hora: '09:00 – 10:00', titulo: 'Conferencia inaugural', barra: colorP, vivo: false },
            { hora: '10:00 – 11:00', titulo: 'Charla en vivo', barra: colorS, vivo: true },
          ].map((x) => (
            <div key={x.titulo} className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
              <span className="w-1" style={{ backgroundColor: x.barra }} />
              <div className="flex-1 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold" style={{ color: colorP }}>{x.hora}</span>
                  {x.vivo && (
                    <span className="rounded-full bg-rose-100 px-1.5 text-[8px] font-bold text-rose-600">EN VIVO</span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-800">{x.titulo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
