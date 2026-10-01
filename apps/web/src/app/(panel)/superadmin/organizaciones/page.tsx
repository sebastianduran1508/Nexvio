'use client';

import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePanel } from '@/components/panel/panel-contexto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Organizaciones (clientes de Nexvio) — pantalla del superadmin.
 *
 * Dos cosas:
 *  1. La lista, que sale de la ventanilla `nexvio_listar_organizaciones()`.
 *     Ya viene cargada en el contexto del panel (la usa el selector), así que
 *     aquí la reutilizamos sin volver a pedirla.
 *  2. El alta, que llama a POST /organizaciones — el endpoint del bloque
 *     puente. Crea la organización Y su primer organizador (el "admin del
 *     congreso") en una sola transacción.
 */
export default function OrganizacionesPage() {
  const { organizaciones, recargarOrganizaciones, orgActual, cambiarOrg } = usePanel();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
            Organizaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Los clientes de Nexvio. Cada uno con sus datos completamente aislados.
          </p>
        </div>
        <Button size="sm" onClick={() => setAbierto((v) => !v)}>
          <Plus /> Nueva organización
        </Button>
      </header>

      {abierto && (
        <FormularioNueva
          alCrear={async () => {
            setAbierto(false);
            await recargarOrganizaciones();
          }}
          alCancelar={() => setAbierto(false)}
        />
      )}

      <ul className="space-y-3">
        {organizaciones.map((o) => {
          const activa = o.id === orgActual?.id;
          return (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-card-foreground">{o.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.slug} · {o.total_congresos}{' '}
                    {o.total_congresos === 1 ? 'congreso' : 'congresos'} · {o.estado}
                  </p>
                </div>
              </div>

              {activa ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  trabajando aquí
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cambiarOrg({ id: o.id, nombre: o.nombre }, '/congresos')}
                >
                  Entrar
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {organizaciones.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Aún no hay organizaciones. Crea la primera.
        </p>
      )}
    </div>
  );
}

/** Alta de organización + su primer organizador (el admin de ese cliente). */
function FormularioNueva({
  alCrear,
  alCancelar,
}: {
  alCrear: () => Promise<void>;
  alCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function campo(k: keyof typeof form) {
    return {
      id: k,
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  /** "Asociación Médica XYZ" -> "asociacion-medica-xyz" */
  function sugerirSlug(nombre: string) {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita tildes
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiFetch('POST', '/organizaciones', {
        nombre: form.nombre,
        slug: form.slug || sugerirSlug(form.nombre),
        organizador: {
          nombre: form.adminNombre,
          email: form.adminEmail,
          password: form.adminPassword,
        },
      });
      await alCrear();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear la organización');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="mb-6 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre de la organización</Label>
          <Input
            {...campo('nombre')}
            required
            placeholder="Asociación Médica XYZ"
            onBlur={() =>
              setForm((f) => ({ ...f, slug: f.slug || sugerirSlug(f.nombre) }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Identificador corto (slug)</Label>
          <Input {...campo('slug')} required placeholder="asociacion-medica-xyz" />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium text-card-foreground">
          Su primer organizador (el admin de este cliente)
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="adminNombre">Nombre</Label>
            <Input {...campo('adminNombre')} required placeholder="Ana Gómez" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminEmail">Correo</Label>
            <Input {...campo('adminEmail')} type="email" required placeholder="ana@xyz.org" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminPassword">Contraseña inicial</Label>
            <Input
              {...campo('adminPassword')}
              type="password"
              required
              minLength={6}
              placeholder="mínimo 6 caracteres"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear organización'}
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
