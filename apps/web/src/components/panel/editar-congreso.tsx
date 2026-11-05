'use client';

import { useState } from 'react';
import { CalendarClock, TriangleAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorBuscable } from '@/components/ui/selector-buscable';
import { PAISES, paisPorNombre } from '@/datos/paises';
import { ciudadesDe } from '@/datos/ciudades';
import { ZONAS } from '@/datos/zonas';
import { etiquetaZona } from '@/lib/zona';
import { cn } from '@/lib/utils';

export type CongresoEditable = {
  id: string;
  nombre: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  zona_horaria: string;
  descripcion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  lugar?: string | null;
};

const ESTADOS = [
  { valor: 'borrador', texto: 'Borrador', ayuda: 'Solo lo ve el staff' },
  { valor: 'publicado', texto: 'Publicado', ayuda: 'Los inscritos lo ven en la app' },
  { valor: 'archivado', texto: 'Archivado', ayuda: 'Terminado, queda de consulta' },
];

/** "24 oct" a partir de "2026-10-24". */
const corto = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');

/**
 * EDITAR LOS DATOS DE UN CONGRESO (8.7.h).
 *
 * Nace de un caso real: "era 20, 21 y 22… y al final también el 23", o "ya no
 * es el 20 sino el 23". Se puede cambiar todo (también publicarlo), y si se
 * mueve la fecha de inicio con la agenda ya armada, el organizador elige si la
 * agenda se CORRE con el congreso (misma hora, N días después). El backend no
 * deja que ninguna sesión quede en un día que ya no es del congreso.
 *
 * La zona horaria solo se puede cambiar mientras no haya sesiones: cambiarla
 * después movería de hora toda la agenda.
 */
export function EditarCongreso({
  congreso,
  totalSesiones,
  alGuardar,
  alCancelar,
}: {
  congreso: CongresoEditable;
  totalSesiones: number;
  alGuardar: () => void;
  alCancelar: () => void;
}) {
  const inicial = {
    nombre: congreso.nombre,
    estado: congreso.estado,
    fecha_inicio: congreso.fecha_inicio.slice(0, 10),
    fecha_fin: congreso.fecha_fin.slice(0, 10),
    zona_horaria: congreso.zona_horaria,
    pais: congreso.pais ?? '',
    ciudad: congreso.ciudad ?? '',
    lugar: congreso.lugar ?? '',
    descripcion: congreso.descripcion ?? '',
  };
  const [form, setForm] = useState(inicial);
  const [correr, setCorrer] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const codigoPais = paisPorNombre(form.pais)?.codigo;
  const opcionesPais = PAISES.map((p) => ({ valor: p.nombre, etiqueta: p.nombre, pista: p.codigo }));
  const opcionesCiudad = ciudadesDe(codigoPais).map((c) => ({ valor: c, etiqueta: c }));

  const delta = Math.round((Date.parse(form.fecha_inicio) - Date.parse(inicial.fecha_inicio)) / 86_400_000);
  const seMueve = totalSesiones > 0 && !Number.isNaN(delta) && delta !== 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }
    // Solo se manda lo que cambió (es un PATCH).
    const cambios: Record<string, unknown> = {};
    for (const k of Object.keys(form) as (keyof typeof form)[]) {
      if (form[k] !== inicial[k]) cambios[k] = form[k];
    }
    if ('pais' in cambios && codigoPais) cambios.pais_codigo = codigoPais;
    if (seMueve) cambios.correr_sesiones = correr;
    if (Object.keys(cambios).length === 0) return alCancelar();

    setGuardando(true);
    try {
      await apiFetch('PATCH', `/congresos/${congreso.id}`, cambios);
      alGuardar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="ec-nombre">Nombre del congreso</Label>
        <Input id="ec-nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Estado</Label>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Estado del congreso">
          {ESTADOS.map((x) => (
            <button
              key={x.valor}
              type="button"
              role="radio"
              aria-checked={form.estado === x.valor}
              onClick={() => set('estado', x.valor)}
              className={cn(
                'rounded-lg px-2 py-2 text-sm font-semibold transition-colors',
                form.estado === x.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {x.texto}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{ESTADOS.find((x) => x.valor === form.estado)?.ayuda}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ec-inicio">Fecha de inicio</Label>
          <Input id="ec-inicio" type="date" value={form.fecha_inicio} onChange={(e) => set('fecha_inicio', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ec-fin">Fecha de fin</Label>
          <Input id="ec-fin" type="date" value={form.fecha_fin} onChange={(e) => set('fecha_fin', e.target.value)} required />
        </div>
      </div>

      {seMueve && (
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <input type="checkbox" checked={correr} onChange={(e) => setCorrer(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5a46f0]" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" /> Correr la agenda {Math.abs(delta)} día{Math.abs(delta) === 1 ? '' : 's'}{' '}
              {delta > 0 ? 'después' : 'antes'}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Las {totalSesiones} sesiones se mueven con el congreso a la misma hora (lo del {corto(inicial.fecha_inicio)} pasa al{' '}
              {corto(form.fecha_inicio)}). Si no lo marcas, se quedan en su día y no podrás guardar si alguna queda por fuera.
            </span>
          </span>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ec-pais">País</Label>
          <SelectorBuscable
            id="ec-pais"
            opciones={opcionesPais}
            valor={form.pais}
            placeholder="Escribe para buscar…"
            alElegir={(v) => setForm((f) => ({ ...f, pais: v, ciudad: v === f.pais ? f.ciudad : '' }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ec-ciudad">Ciudad</Label>
          <SelectorBuscable
            id="ec-ciudad"
            opciones={opcionesCiudad}
            valor={form.ciudad}
            deshabilitado={!form.pais}
            permitirLibre={opcionesCiudad.length === 0}
            placeholder={!form.pais ? 'Elige primero el país' : 'Escribe para buscar…'}
            alElegir={(v) => set('ciudad', v)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ec-zona">Zona horaria del evento</Label>
        <select
          id="ec-zona"
          value={form.zona_horaria}
          disabled={totalSesiones > 0}
          onChange={(e) => set('zona_horaria', e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {ZONAS.map((z) => (
            <option key={z.valor} value={z.valor} className="bg-card">
              {z.etiqueta} · {etiquetaZona(z.valor).split(' · ')[1] ?? ''}
            </option>
          ))}
        </select>
        {totalSesiones > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
            No se puede cambiar con la agenda armada: todas las charlas cambiarían de hora.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ec-lugar">Sede o lugar</Label>
        <Input id="ec-lugar" value={form.lugar} onChange={(e) => set('lugar', e.target.value)} placeholder="Centro de Convenciones" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ec-desc">Descripción</Label>
        <textarea
          id="ec-desc"
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="De qué trata el evento"
        />
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
