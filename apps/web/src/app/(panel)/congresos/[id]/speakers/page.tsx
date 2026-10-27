'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mic2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorBuscable } from '@/components/ui/selector-buscable';
import { DialogoConfirmar } from '@/components/panel/dialogo-confirmar';
import { MenuAcciones } from '@/components/panel/menu-acciones';
import { PanelLateral } from '@/components/panel/panel-lateral';
import { AvatarPonente, bandera } from '@/components/panel/avatar-ponente';
import { PAISES, paisPorNombre } from '@/datos/paises';

type Ponente = {
  id: string;
  nombre: string;
  bio: string | null;
  foto_url: string | null;
  cargo: string | null;
  empresa: string | null;
  pais: string | null;
  pais_codigo: string | null;
  orden: number | null;
  sesiones: { sesion: { id: string; titulo: string; inicio: string } }[];
};

/**
 * SPEAKERS de un congreso (Bloque 8.4.b).
 *
 * La ficha del ponente que luego ve el asistente en la app: nombre, cargo,
 * empresa, país (con bandera) y biografía. La foto llega en el 8.4.d.
 *
 * Mismo patrón que Asistentes (8.3): lista + formulario en el panel lateral
 * (crear y editar usan el MISMO formulario) + menú de acciones por tarjeta +
 * confirmación antes de borrar.
 */
export default function SpeakersCongresoPage() {
  const { id: congresoId } = useParams<{ id: string }>();

  const [nombreCongreso, setNombreCongreso] = useState('');
  const [ponentes, setPonentes] = useState<Ponente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // null = cerrado · 'nuevo' = crear · un Ponente = editar ese.
  const [enFormulario, setEnFormulario] = useState<Ponente | 'nuevo' | null>(null);
  const [aBorrar, setABorrar] = useState<Ponente | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [congreso, lista] = await Promise.all([
        apiFetch<{ nombre: string }>('GET', `/congresos/${congresoId}`),
        apiFetch<Ponente[]>('GET', `/congresos/${congresoId}/ponentes`),
      ]);
      setNombreCongreso(congreso.nombre);
      setPonentes(lista);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar los speakers');
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function borrar() {
    const victima = aBorrar;
    setABorrar(null);
    if (!victima) return;
    try {
      await apiFetch('DELETE', `/ponentes/${victima.id}`);
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo borrar');
    }
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? ponentes.filter((p) =>
        [p.nombre, p.cargo, p.empresa, p.pais]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)))
    : ponentes;

  const charlasDe = (p: Ponente) => p.sesiones.length;

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
            Speakers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {nombreCongreso && `${nombreCongreso} · `}
            {ponentes.length} ponente{ponentes.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button size="sm" onClick={() => setEnFormulario('nuevo')}>
          <Plus /> Nuevo speaker
        </Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {ponentes.length > 6 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cargo, empresa o país…"
            className="pl-9"
          />
        </div>
      )}

      {cargando && <p className="text-muted-foreground">Cargando…</p>}

      {!cargando && ponentes.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Mic2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Todavía no hay speakers en este congreso.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créalos aquí y luego asígnalos a sus charlas desde la Agenda.
          </p>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {visibles.map((p) => (
          <li
            key={p.id}
            onClick={() => setEnFormulario(p)}
            className="flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
          >
            <AvatarPonente nombre={p.nombre} fotoUrl={p.foto_url} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-card-foreground">{p.nombre}</p>
                  {(p.cargo || p.empresa) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {[p.cargo, p.empresa].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <MenuAcciones
                  etiqueta={`Acciones de ${p.nombre}`}
                  acciones={[
                    { texto: 'Editar', Icono: Pencil, alHacer: () => setEnFormulario(p) },
                    { texto: 'Borrar', Icono: Trash2, peligroso: true, alHacer: () => setABorrar(p) },
                  ]}
                />
              </div>
              {p.bio && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {p.pais && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {bandera(p.pais_codigo)} {p.pais}
                  </span>
                )}
                {charlasDe(p) > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {charlasDe(p)} charla{charlasDe(p) === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="rounded-full bg-coral/15 px-2 py-0.5 font-medium text-coral">
                    Sin charlas asignadas
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {q && visibles.length === 0 && ponentes.length > 0 && (
        <p className="py-6 text-center text-muted-foreground">Nadie coincide con «{busqueda}».</p>
      )}

      <PanelLateral
        abierto={enFormulario !== null}
        titulo={enFormulario === 'nuevo' ? 'Nuevo speaker' : 'Editar speaker'}
        subtitulo={nombreCongreso}
        alCerrar={() => setEnFormulario(null)}
      >
        {enFormulario !== null && (
          <FormularioPonente
            // key: al pasar de un ponente a otro, el formulario arranca de cero.
            key={enFormulario === 'nuevo' ? 'nuevo' : enFormulario.id}
            congresoId={congresoId}
            ponente={enFormulario === 'nuevo' ? null : enFormulario}
            ordenNuevo={ponentes.length}
            alGuardar={async () => { setEnFormulario(null); await cargar(); }}
            alCancelar={() => setEnFormulario(null)}
          />
        )}
      </PanelLateral>

      <DialogoConfirmar
        abierto={aBorrar !== null}
        titulo={`¿Borrar a ${aBorrar?.nombre}?`}
        mensaje={
          aBorrar && charlasDe(aBorrar) > 0
            ? `Dicta ${charlasDe(aBorrar)} charla${charlasDe(aBorrar) === 1 ? '' : 's'}: se quitará de ${charlasDe(aBorrar) === 1 ? 'ella' : 'ellas'}. Las charlas no se borran.`
            : 'Se borrará su ficha. Esta acción no se puede deshacer.'
        }
        textoConfirmar="Borrar"
        peligroso
        alConfirmar={borrar}
        alCancelar={() => setABorrar(null)}
      />
    </div>
  );
}

/**
 * Formulario de crear/editar. Si `ponente` es null, crea; si no, edita.
 *
 * Los campos vacíos se mandan como null (no como ""), para que "borrar el
 * cargo" deje la columna realmente vacía en la base.
 */
function FormularioPonente({
  congresoId,
  ponente,
  ordenNuevo,
  alGuardar,
  alCancelar,
}: {
  congresoId: string;
  ponente: Ponente | null;
  ordenNuevo: number;
  alGuardar: () => Promise<void>;
  alCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombre: ponente?.nombre ?? '',
    cargo: ponente?.cargo ?? '',
    empresa: ponente?.empresa ?? '',
    pais: ponente?.pais ?? '',
    bio: ponente?.bio ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function campo(k: 'nombre' | 'cargo' | 'empresa') {
    return {
      id: `ponente-${k}`,
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  const vacioANull = (v: string) => (v.trim() ? v.trim() : null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const pais = paisPorNombre(form.pais);
    const datos = {
      nombre: form.nombre.trim(),
      cargo: vacioANull(form.cargo),
      empresa: vacioANull(form.empresa),
      bio: vacioANull(form.bio),
      pais: pais?.nombre ?? null,
      pais_codigo: pais?.codigo ?? null,
    };
    try {
      if (ponente) {
        await apiFetch('PATCH', `/ponentes/${ponente.id}`, datos);
      } else {
        await apiFetch('POST', `/congresos/${congresoId}/ponentes`, { ...datos, orden: ordenNuevo });
      }
      await alGuardar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ponente-nombre">Nombre</Label>
        <Input {...campo('nombre')} required placeholder="Dra. Ana Ríos" />
        <p className="text-xs text-muted-foreground">Tal como quieres que se vea en la app, con el título si lo tiene.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ponente-cargo">Cargo (opcional)</Label>
        <Input {...campo('cargo')} placeholder="Cardióloga intervencionista" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ponente-empresa">Empresa o institución (opcional)</Label>
        <Input {...campo('empresa')} placeholder="Instituto Cardiológico Andino" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ponente-pais">País (opcional)</Label>
        <SelectorBuscable
          id="ponente-pais"
          opciones={PAISES.map((p) => ({ valor: p.nombre, etiqueta: `${bandera(p.codigo)} ${p.nombre}`, pista: p.codigo }))}
          valor={form.pais}
          alElegir={(v) => setForm((f) => ({ ...f, pais: v }))}
          placeholder="Escribe para buscar…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ponente-bio">Biografía corta (opcional)</Label>
        <textarea
          id="ponente-bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={4}
          maxLength={600}
          placeholder="Dos o tres líneas sobre su experiencia."
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <p className="text-right text-xs text-muted-foreground">{form.bio.length}/600</p>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        La foto se podrá subir muy pronto. Mientras tanto, la app muestra las iniciales.
      </p>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : ponente ? 'Guardar cambios' : 'Crear speaker'}
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
