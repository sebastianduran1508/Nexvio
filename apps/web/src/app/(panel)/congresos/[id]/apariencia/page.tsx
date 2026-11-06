'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleUser,
  Clock,
  Coffee,
  Home,
  Star,
  Users,
  Check,
  CircleAlert,
  ImageUp,
  MapPin,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  TriangleAlert,
  Palette,
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
  aclarar,
  textoSobre,
  legibleSobre,
} from '@/lib/color';
import { ChipTitulo } from '@/components/panel/encabezado-pagina';

type Personalizacion = {
  logo_url: string | null;
  imagen_portada_url: string | null;
  color_primario: string | null;
  color_secundario: string | null;
  tema_default?: Tema; // 8.7.g
};
type Tema = 'sistema' | 'claro' | 'oscuro';
type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  ciudad?: string | null;
  lugar?: string | null;
  personalizacion: Personalizacion | null;
  sponsors: { id: string; nombre: string; logo_url: string | null }[];
  // 8.7.j: para los indicadores de la vista previa (vienen en GET /congresos/:id)
  sesiones?: { tipo?: string | null }[];
  ponentes?: { id: string }[];
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
  // 8.7.g: el tema por defecto en la app, y con qué modo se ve la vista previa.
  const [tema, setTema] = useState<Tema>('sistema');
  const [previaOscura, setPreviaOscura] = useState(false);
  const [logo, setLogo] = useState<Imagen>(SIN_CAMBIOS);
  const [portada, setPortada] = useState<Imagen>(SIN_CAMBIOS);

  const cargar = useCallback(async () => {
    try {
      const c = await apiFetch<Congreso>('GET', `/congresos/${congresoId}`);
      setCongreso(c);
      setPrimario(c.personalizacion?.color_primario ?? null);
      setSecundario(c.personalizacion?.color_secundario ?? null);
      setTema(c.personalizacion?.tema_default ?? 'sistema');
      setPreviaOscura(c.personalizacion?.tema_default === 'oscuro');
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
    tema !== (p?.tema_default ?? 'sistema') ||
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
      if (
        primario !== (p?.color_primario ?? null) ||
        secundario !== (p?.color_secundario ?? null) ||
        tema !== (p?.tema_default ?? 'sistema')
      ) {
        await apiFetch('PUT', `/congresos/${congresoId}/personalizacion`, {
          color_primario: primario,
          color_secundario: secundario,
          tema_default: tema,
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

  /**
   * "Colores de Nexvio": vuelve SOLO a los colores de Nexvio (null = los de la
   * marca). El logo, la portada y el tema por defecto NO se tocan — antes este
   * botón también quitaba las imágenes (bug visto en el 8.7.j, 6-nov).
   * Como todo en esta pantalla, no se guarda hasta "Guardar cambios".
   */
  function restablecer() {
    setPrimario(null);
    setSecundario(null);
    setGuardado(false);
  }

  const colorP = primario ?? PRIMARIO_NEXVIO;
  const colorS = secundario ?? SECUNDARIO_NEXVIO;

  return (
    <div className="contenido-panel">
      <Link
        href={`/congresos/${congresoId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al congreso
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">
        <ChipTitulo Icono={Palette} />
            Apariencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {congreso.nombre} · así se verá el congreso en la app de los asistentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={restablecer} disabled={guardando}>
            <RotateCcw /> Colores de Nexvio
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
          <Bloque titulo="Logo del evento" ayuda="Se muestra en la cabecera del congreso, en un recuadro. Queda mejor cuadrado; si tiene fondo transparente, se ve sobre blanco.">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white">
                {logoVisible ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoVisible} alt="Logo" className="h-full w-full object-contain" />
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

          {/* 8.7.g */}
          <Bloque
            titulo="Tema de la app"
            ayuda="Cómo se ve la app la primera vez. Cada asistente puede cambiarlo para sí en su Perfil → Apariencia."
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  { valor: 'sistema', texto: 'Según el teléfono', sub: 'Claro u oscuro, como lo tenga', Icono: Smartphone },
                  { valor: 'claro', texto: 'Claro', sub: 'Fondo blanco', Icono: Sun },
                  { valor: 'oscuro', texto: 'Oscuro', sub: 'Ideal para auditorios', Icono: Moon },
                ] as const
              ).map(({ valor, texto, sub, Icono }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setTema(valor);
                    if (valor !== 'sistema') setPreviaOscura(valor === 'oscuro');
                    setGuardado(false);
                  }}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                    tema === valor ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
                  )}
                >
                  <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', tema === valor ? 'text-primary' : 'text-muted-foreground')} />
                  <span>
                    <span className={cn('block text-sm font-semibold', tema === valor ? 'text-primary' : 'text-foreground')}>{texto}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </Bloque>
        </div>

        {/* ================= Vista previa ================= */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa en la app
          </p>
          {/* 8.7.g: ver la vista previa en claro o en oscuro */}
          <div className="mb-3 flex justify-center gap-1">
            {[
              { oscuro: false, texto: 'Claro', Icono: Sun },
              { oscuro: true, texto: 'Oscuro', Icono: Moon },
            ].map(({ oscuro, texto, Icono }) => (
              <button
                key={texto}
                type="button"
                onClick={() => setPreviaOscura(oscuro)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  previaOscura === oscuro ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Icono className="h-3.5 w-3.5" /> {texto}
              </button>
            ))}
          </div>
          <VistaPreviaCelular
            congreso={congreso}
            colorP={colorP}
            colorS={colorS}
            propio={primario !== null}
            logo={logoVisible}
            portada={portadaVisible}
            oscuro={previaOscura}
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
 * La app en miniatura, con los colores, el logo y la portada elegidos.
 * 8.7.g: en claro o en oscuro.
 * 8.7.j: espejo del rediseño de la app (decisiones 32–33): los MISMOS tokens
 * de apps/mobile/src/tema/tema.ts y la MISMA regla de personalización de
 * MarcaContext:
 *   - degradado de 3 tonos: con colores propios, del color principal (profundo
 *     → principal); sin ellos, el de Nexvio (#2E1A8C → #4A35D6 → #5A46F0);
 *   - brillo de la esquina: con colores propios, el principal 45 % más claro;
 *     sin ellos, el coral;
 *   - borde de las tarjetas: el principal semitransparente;
 *   - barra de pestañas flotante con la pestaña activa en pastilla blanca.
 * Si cambia el diseño de la app, cambiar también aquí.
 */
function VistaPreviaCelular({
  congreso,
  colorP,
  colorS,
  propio,
  logo,
  portada,
  oscuro = false,
}: {
  congreso: Congreso;
  colorP: string;
  colorS: string;
  /** ¿El congreso tiene color principal propio? (si no, los de Nexvio) */
  propio: boolean;
  logo: string | null;
  portada: string | null;
  oscuro?: boolean;
}) {
  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/\./g, '');
  // La misma paleta de la app (apps/mobile/src/tema/tema.ts, 8.7.j).
  const c = oscuro
    ? { fondo: '#0D0B18', tarjeta: '#17152A', borde: '#2A2645', texto: '#F4F3FA', suave: '#B9B5CC', ambarFondo: 'rgba(245,158,11,0.10)', ambarBorde: 'rgba(245,158,11,0.45)', ambarTexto: '#FBBF5A' }
    : { fondo: '#F4F2FF', tarjeta: '#FFFFFF', borde: '#E4DFFB', texto: '#1B1638', suave: '#55506E', ambarFondo: '#FFF6E5', ambarBorde: '#F2C063', ambarTexto: '#8A5300' };

  // La misma regla de MarcaContext (useMarca) en la app.
  const degradado = propio ? [oscurecer(colorP, 0.5), oscurecer(colorP, 0.2), colorP] : ['#2E1A8C', '#4A35D6', '#5A46F0'];
  const brillo = propio ? aclarar(colorP, 0.45) : SECUNDARIO_NEXVIO;
  const fondoMarca = (dir: string, foco: string) =>
    `radial-gradient(${foco}, ${rgba(brillo, 0.5)} 0%, ${rgba(brillo, 0)} 60%), linear-gradient(${dir}, ${degradado.join(', ')})`;
  const bordeMarca = rgba(colorP, oscuro ? 0.6 : 0.45);
  const textoPrimario = legibleSobre(colorP, c.tarjeta);

  const charlas = (congreso.sesiones ?? []).filter((s) => s.tipo !== 'break').length;
  const ponentes = congreso.ponentes?.length ?? 0;

  return (
    <div className="mx-auto w-[300px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
      <div className="relative h-[600px] overflow-hidden rounded-[1.9rem] transition-colors" style={{ backgroundColor: c.fondo }}>
        {/* ---- Cabecera: degradado de 3 tonos + brillo ---- */}
        <div className="rounded-b-[22px] px-3.5 pb-3.5 pt-8 text-white" style={{ background: fondoMarca('160deg', '110% 90% at 100% 0%') }}>
          <div className="flex items-center gap-2.5">
            {logo && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" className="h-full w-full object-contain" />
              </span>
            )}
            <p className="line-clamp-3 flex-1 font-[family-name:var(--font-space-grotesk)] text-[15px] font-bold leading-tight">
              {congreso.nombre}
            </p>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[9.5px] font-semibold text-white/90">
            <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: colorS, color: textoSobre(colorS) }}>
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: textoSobre(colorS) }} /> EN CURSO
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5" /> {fecha(congreso.fecha_inicio)} – {fecha(congreso.fecha_fin)}
            </span>
            {(congreso.lugar || congreso.ciudad) && (
              <span className="flex min-w-0 items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" /> {[congreso.lugar, congreso.ciudad].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[
              [charlas, charlas === 1 ? 'charla' : 'charlas'],
              [ponentes, ponentes === 1 ? 'ponente' : 'ponentes'],
              ['Día 1', 'de 2'],
            ].map(([v, t]) => (
              <div key={String(t)} className="rounded-[10px] border border-white/20 bg-white/[0.13] px-2 py-1.5">
                <p className="font-[family-name:var(--font-space-grotesk)] text-[13px] font-bold leading-none">{v}</p>
                <p className="mt-0.5 text-[8.5px] font-semibold text-white/85">{t}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 p-3">
          {portada && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portada} alt="" className="aspect-[16/9] w-full rounded-[14px] object-cover" />
          )}

          {/* ---- AHORA (ejemplo) ---- */}
          <div className="space-y-1.5 rounded-[14px] border-[1.5px] p-2.5" style={{ backgroundColor: c.tarjeta, borderColor: bordeMarca }}>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full px-1.5 py-px text-[7.5px] font-bold" style={{ backgroundColor: oscuro ? 'rgba(244,63,94,0.16)' : '#FDE7EB', color: oscuro ? '#FB7185' : '#C8102E' }}>
                <span className="h-1 w-1 rounded-full bg-current" /> EN VIVO
              </span>
              <span className="text-[9px] font-semibold" style={{ color: c.suave }}>10:00 – 11:00 · Salón 2</span>
            </div>
            <p className="font-[family-name:var(--font-space-grotesk)] text-[12px] font-bold leading-tight" style={{ color: c.texto }}>
              Charla que está pasando ahora
            </p>
            <div className="flex h-7 items-center justify-center gap-1 rounded-[9px] text-[10px] font-bold" style={{ backgroundColor: colorP, color: textoSobre(colorP) }}>
              Entrar a la sala en vivo <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* ---- Sponsors ---- */}
          {congreso.sponsors.length > 0 && (
            <div className="flex gap-1.5 overflow-hidden">
              {congreso.sponsors.slice(0, 4).map((s) => (
                <span key={s.id} className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white p-1" style={{ borderColor: c.borde }}>
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400">{s.nombre.slice(0, 6)}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* ---- Agenda en línea de tiempo ---- */}
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: rgba(colorP, oscuro ? 0.2 : 0.1), color: textoPrimario }}>
              <Clock className="h-3 w-3" />
            </span>
            <span className="font-[family-name:var(--font-space-grotesk)] text-[12px] font-bold" style={{ color: c.texto }}>Agenda</span>
          </div>
          <div className="grid grid-cols-[30px_1fr] items-start gap-x-2 gap-y-1.5">
            <span className="pt-2 text-[9.5px] font-bold" style={{ color: c.texto }}>9:30</span>
            <div className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed px-2 py-1.5" style={{ backgroundColor: c.ambarFondo, borderColor: c.ambarBorde, color: c.ambarTexto }}>
              <Coffee className="h-3 w-3" /> <span className="text-[10px] font-bold">Pausa de café</span>
            </div>
            <span className="pt-2 text-[9.5px] font-bold" style={{ color: c.texto }}>10:00</span>
            <div className="flex overflow-hidden rounded-[10px] border-[1.5px]" style={{ backgroundColor: c.tarjeta, borderColor: bordeMarca }}>
              <span className="w-1" style={{ backgroundColor: colorP }} />
              <div className="flex-1 p-2">
                <p className="text-[9px] font-bold" style={{ color: textoPrimario }}>10:00 – 11:00</p>
                <p className="text-[10.5px] font-bold" style={{ color: c.texto }}>Conferencia inaugural</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Barra de pestañas flotante (siempre con la marca) ---- */}
        <div className="absolute inset-x-0 bottom-0 px-2 pb-2.5 pt-6" style={{ background: `linear-gradient(180deg, transparent, ${c.fondo} 45%)` }}>
          <div className="grid h-11 grid-cols-4 items-center rounded-[15px] px-1 shadow-lg" style={{ background: fondoMarca('90deg', '60% 220% at 100% 50%') }}>
            {[
              { Icono: Home, texto: 'Congreso', activa: true },
              { Icono: Star, texto: 'Mi agenda' },
              { Icono: Users, texto: 'Networking' },
              { Icono: CircleUser, texto: 'Perfil' },
            ].map(({ Icono, texto, activa }) => (
              <span
                key={texto}
                className={cn('mx-0.5 flex h-9 flex-col items-center justify-center gap-px rounded-[11px] text-[7.5px] font-bold', !activa && 'text-white/80')}
                style={activa ? { backgroundColor: '#FFFFFF', color: legibleSobre(colorP, '#FFFFFF') } : undefined}
              >
                <Icono className="h-3.5 w-3.5" /> {texto}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "#5A46F0" + 0.45 -> "rgba(90,70,240,0.45)" (como conAlfa de la app). */
function rgba(hex: string, alfa: number) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alfa})`;
}
