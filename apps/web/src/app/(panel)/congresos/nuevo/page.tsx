'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePanel } from '@/components/panel/panel-contexto';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorBuscable } from '@/components/ui/selector-buscable';
import { PAISES, paisPorNombre } from '@/datos/paises';
import { ciudadesDe } from '@/datos/ciudades';

/**
 * Alta de un congreso (el objetivo principal del Bloque 8.2).
 *
 * Lo interesante: este formulario sirve IGUAL para un organizador y para el
 * superadmin. Llama a POST /congresos sin decir a qué organización pertenece,
 * porque eso lo decide el tenant activo de la petición. Es el RLS (WITH CHECK)
 * quien garantiza que la fila nueva quede en la organización correcta.
 */
export default function NuevoCongresoPage() {
  const router = useRouter();
  const { esSuperadmin, orgActual } = usePanel();

  const [form, setForm] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    pais: '',
    ciudad: '',
    lugar: '',
    descripcion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El país manda: al cambiarlo se limpia la ciudad, porque las ciudades que
  // se ofrecen dependen de él (no tendría sentido "Colombia + Madrid").
  const codigoPais = paisPorNombre(form.pais)?.codigo;
  const opcionesPais = PAISES.map((p) => ({
    valor: p.nombre,
    etiqueta: p.nombre,
    pista: p.codigo,
  }));
  const opcionesCiudad = ciudadesDe(codigoPais).map((c) => ({
    valor: c,
    etiqueta: c,
  }));

  function campo(k: keyof typeof form) {
    return {
      id: k,
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }

    setGuardando(true);
    try {
      const creado = await apiFetch<{ id: string }>('POST', '/congresos', {
        nombre: form.nombre,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        // Los opcionales solo se mandan si tienen algo.
        ...(form.ciudad ? { ciudad: form.ciudad } : {}),
        ...(form.pais ? { pais: form.pais } : {}),
        ...(codigoPais ? { pais_codigo: codigoPais } : {}),
        ...(form.lugar ? { lugar: form.lugar } : {}),
        ...(form.descripcion ? { descripcion: form.descripcion } : {}),
      });
      router.push(`/congresos/${creado.id}`);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear el congreso');
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-6 md:p-8">
      <Link
        href="/congresos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Congresos
      </Link>

      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
        Nuevo congreso
      </h1>
      {esSuperadmin && orgActual && (
        <p className="mt-1 text-sm text-muted-foreground">
          Se creará en{' '}
          <span className="font-medium text-foreground">{orgActual.nombre}</span>
        </p>
      )}

      <form onSubmit={enviar} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre del congreso</Label>
          <Input {...campo('nombre')} required placeholder="Congreso Nacional 2026" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
            <Input {...campo('fecha_inicio')} type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha_fin">Fecha de fin</Label>
            <Input {...campo('fecha_fin')} type="date" required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pais">País (opcional)</Label>
            <SelectorBuscable
              id="pais"
              opciones={opcionesPais}
              valor={form.pais}
              placeholder="Escribe para buscar…"
              requerido
              alElegir={(v) =>
                setForm((f) => ({
                  ...f,
                  pais: v,
                  // Cambió el país -> la ciudad anterior ya no aplica.
                  ciudad: v === f.pais ? f.ciudad : '',
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ciudad">Ciudad (opcional)</Label>
            <SelectorBuscable
              id="ciudad"
              opciones={opcionesCiudad}
              valor={form.ciudad}
              deshabilitado={!form.pais}
              permitirLibre={opcionesCiudad.length === 0}
              requerido={opcionesCiudad.length > 0}
              placeholder={
                !form.pais
                  ? 'Elige primero el país'
                  : opcionesCiudad.length === 0
                    ? 'Escribe la ciudad'
                    : 'Escribe para buscar…'
              }
              alElegir={(v) => setForm((f) => ({ ...f, ciudad: v }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lugar">Sede o lugar (opcional)</Label>
          <Input {...campo('lugar')} placeholder="Centro de Convenciones" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descripcion">Descripción (opcional)</Label>
          <Input {...campo('descripcion')} placeholder="De qué trata el evento" />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear congreso'}
          </Button>
          <Link href="/congresos" className={buttonVariants({ variant: 'outline' })}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
