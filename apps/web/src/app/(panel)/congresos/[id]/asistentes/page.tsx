'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Download, Eye, KeyRound, Pencil, Plus, Search, Trash2, Upload,
} from 'lucide-react';
import { apiFetch, apiDescargar } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorBuscable } from '@/components/ui/selector-buscable';
import { DialogoConfirmar } from '@/components/panel/dialogo-confirmar';
import { MenuAcciones } from '@/components/panel/menu-acciones';
import { PanelLateral } from '@/components/panel/panel-lateral';
import { PAISES, paisPorNombre } from '@/datos/paises';

type Asistente = {
  inscripcion_id: string;
  id: string;
  username: string | null;
  nombre: string;
  apellidos: string | null;
  email: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  telefono: string | null;
  cargo: string | null;
  empresa: string | null;
  pais: string | null;
  pais_codigo: string | null;
  tipo_suscripcion: string | null;
  origen: string;
  debe_cambiar_password: boolean;
};

type Ficha = Asistente & {
  email_sintetico: boolean;
  creado_en: string;
  acepto_datos_en: string | null;
  inscripciones: {
    id: string;
    estado: string;
    tipo_suscripcion: string | null;
    origen: string;
    registrado_en: string;
    congreso: { id: string; nombre: string };
  }[];
};

type Credencial = {
  username: string;
  password_temporal: string;
  nombres?: string;
  estado?: 'temporal' | 'activa';
};

const TIPOS_DOCUMENTO = ['CC', 'CE', 'PA', 'TI', 'NIT'];

export default function AsistentesPage() {
  const { id: congresoId } = useParams<{ id: string }>();

  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [formAbierto, setFormAbierto] = useState(false);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [editando, setEditando] = useState(false);
  const [aQuitar, setAQuitar] = useState<Asistente | null>(null);
  const [aRestablecer, setARestablecer] = useState<Asistente | null>(null);
  const [credenciales, setCredenciales] = useState<Credencial[] | null>(null);
  const [listadoAbierto, setListadoAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setAsistentes(await apiFetch<Asistente[]>('GET', `/congresos/${congresoId}/asistentes`));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar los asistentes');
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function abrirFicha(a: Asistente, editar = false) {
    setEditando(editar);
    try {
      setFicha(await apiFetch<Ficha>('GET', `/asistentes/${a.id}`));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar la ficha');
    }
  }

  async function quitar() {
    const victima = aQuitar;
    setAQuitar(null);
    if (!victima) return;
    try {
      await apiFetch('DELETE', `/inscripciones/${victima.inscripcion_id}/asistente`);
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo quitar del congreso');
    }
  }

  async function restablecer() {
    const quien = aRestablecer;
    setARestablecer(null);
    if (!quien) return;
    try {
      const c = await apiFetch<Credencial>('POST', `/asistentes/${quien.id}/restablecer-password`);
      setCredenciales([c]);
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo restablecer la contraseña');
    }
  }

  /**
   * Descarga el listado de acceso COMPLETO del congreso.
   *
   * Trae a todos los inscritos: a quienes aún no han estrenado la cuenta se
   * les genera una contraseña nueva, y a quienes ya pusieron la suya se les
   * incluye igual pero sin clave. Así el archivo es un censo completo y no una
   * lista parcial.
   */
  async function descargarListado() {
    setListadoAbierto(false);
    try {
      const r = await apiFetch<{
        congreso: string;
        total: number;
        regeneradas: number;
        credenciales: Credencial[];
      }>('POST', `/congresos/${congresoId}/listado-acceso`);

      if (r.total === 0) {
        setError('Todavía no hay nadie inscrito a este congreso.');
        return;
      }
      await apiDescargar(
        'POST',
        `/congresos/${congresoId}/importacion/credenciales.xlsx`,
        'listado-de-acceso-nexvio.xlsx',
        { congreso: r.congreso, credenciales: r.credenciales },
      );
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo generar el listado');
    }
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? asistentes.filter((a) =>
        [a.nombre, a.apellidos, a.username, a.numero_documento, a.empresa, a.cargo]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)))
    : asistentes;

  const sinEstrenar = asistentes.filter((a) => a.debe_cambiar_password).length;

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
            Asistentes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {asistentes.length} inscrito{asistentes.length === 1 ? '' : 's'}
            {sinEstrenar > 0 && ` · ${sinEstrenar} sin estrenar su cuenta`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => apiDescargar('GET', `/congresos/${congresoId}/importacion/plantilla`,
              'plantilla-inscritos-nexvio.xlsx').catch((e) => setError(e.message))}
          >
            <Download /> Plantilla
          </Button>
          {asistentes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setListadoAbierto(true)}>
              <KeyRound /> Listado de acceso
            </Button>
          )}
          <Link
            href={`/congresos/${congresoId}/asistentes/importar`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Upload /> Importar Excel
          </Link>
          <Button size="sm" onClick={() => setFormAbierto((v) => !v)}>
            <Plus /> Agregar uno
          </Button>
        </div>
      </header>

      {credenciales && (
        <TarjetaCredenciales
          credenciales={credenciales}
          alCerrar={() => setCredenciales(null)}
        />
      )}

      {formAbierto && (
        <FormularioAsistente
          congresoId={congresoId}
          alCrear={async (c) => { setFormAbierto(false); setCredenciales([c]); await cargar(); }}
          alCancelar={() => setFormAbierto(false)}
        />
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {asistentes.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, usuario, documento, cargo o empresa…"
            className="pl-9"
          />
        </div>
      )}

      {cargando && <p className="text-muted-foreground">Cargando…</p>}

      {!cargando && asistentes.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">Todavía no hay nadie inscrito.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Descarga la plantilla, pásasela a la organización e importa el Excel que te devuelvan.
          </p>
        </div>
      )}

      {visibles.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Persona</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Suscripción</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr
                  key={a.inscripcion_id}
                  onClick={() => abrirFicha(a)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <span className="block font-medium text-foreground">
                      {a.nombre} {a.apellidos ?? ''}
                    </span>
                    {a.cargo && <span className="block text-xs text-muted-foreground">{a.cargo}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-foreground">{a.username ?? '—'}</span>
                    {a.debe_cambiar_password && (
                      <span
                        className="ml-2 rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-medium text-coral"
                        title="Todavía no ha entrado por primera vez"
                      >
                        sin estrenar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.tipo_documento} {a.numero_documento}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.tipo_suscripcion ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.empresa ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <MenuAcciones
                      etiqueta={`Acciones de ${a.nombre}`}
                      acciones={[
                        { texto: 'Ver ficha', Icono: Eye, alHacer: () => abrirFicha(a) },
                        { texto: 'Editar datos', Icono: Pencil, alHacer: () => abrirFicha(a, true) },
                        {
                          texto: 'Restablecer contraseña',
                          Icono: KeyRound,
                          alHacer: () => setARestablecer(a),
                        },
                        {
                          texto: 'Quitar del congreso',
                          Icono: Trash2,
                          peligroso: true,
                          alHacer: () => setAQuitar(a),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {q && visibles.length === 0 && asistentes.length > 0 && (
        <p className="py-6 text-center text-muted-foreground">
          Nadie coincide con «{busqueda}».
        </p>
      )}

      {/* ----------------------------- ficha / edición ----------------------- */}
      <PanelLateral
        abierto={!!ficha}
        titulo={ficha ? `${ficha.nombre} ${ficha.apellidos ?? ''}`.trim() : ''}
        subtitulo={ficha?.username ? `Usuario ${ficha.username}` : undefined}
        alCerrar={() => { setFicha(null); setEditando(false); }}
      >
        {ficha &&
          (editando ? (
            <FormularioEdicion
              ficha={ficha}
              alGuardar={async () => {
                setFicha(null);
                setEditando(false);
                await cargar();
              }}
              alCancelar={() => setEditando(false)}
            />
          ) : (
            <FichaAsistente
              ficha={ficha}
              alEditar={() => setEditando(true)}
              alRestablecer={() => {
                const a = asistentes.find((x) => x.id === ficha.id);
                setFicha(null);
                if (a) setARestablecer(a);
              }}
            />
          ))}
      </PanelLateral>

      <DialogoConfirmar
        abierto={!!aQuitar}
        titulo="¿Quitar del congreso?"
        mensaje={aQuitar
          ? `${aQuitar.nombre} ${aQuitar.apellidos ?? ''} dejará de estar inscrito a este congreso. Su cuenta y sus datos se conservan: si está inscrito a otros congresos, los mantiene.`
          : undefined}
        textoConfirmar="Quitar"
        peligroso
        alConfirmar={quitar}
        alCancelar={() => setAQuitar(null)}
      />

      <DialogoConfirmar
        abierto={!!aRestablecer}
        titulo="¿Restablecer la contraseña?"
        mensaje={aRestablecer
          ? `Se generará una contraseña nueva para ${aRestablecer.nombre}. La anterior dejará de funcionar inmediatamente, así que asegúrate de poder entregarle la nueva.`
          : undefined}
        textoConfirmar="Generar contraseña nueva"
        alConfirmar={restablecer}
        alCancelar={() => setARestablecer(null)}
      />

      <DialogoConfirmar
        abierto={listadoAbierto}
        titulo="¿Descargar el listado de acceso?"
        mensaje={
          `El Excel traerá a los ${asistentes.length} inscritos con su usuario. ` +
          (sinEstrenar > 0
            ? `A las ${sinEstrenar} personas que todavía no han entrado se les generará una contraseña nueva — si ya les habías entregado unas credenciales, esas dejarán de funcionar. `
            : '') +
          (asistentes.length - sinEstrenar > 0
            ? `A las ${asistentes.length - sinEstrenar} que ya pusieron su propia contraseña no se les toca nada: salen en el listado sin clave.`
            : '')
        }
        textoConfirmar="Generar y descargar"
        alConfirmar={descargarListado}
        alCancelar={() => setListadoAbierto(false)}
      />
    </div>
  );
}

/* ====================================================================== */

/**
 * Las credenciales recién generadas.
 *
 * Esto es lo único que ve el admin de una contraseña, y solo esta vez: en la
 * base queda únicamente su hash. De ahí el aviso tan insistente.
 */
function TarjetaCredenciales({
  credenciales,
  alCerrar,
}: {
  credenciales: Credencial[];
  alCerrar: () => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-coral/40 bg-coral/5 p-4">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <KeyRound className="h-4 w-4 text-coral" />
        {credenciales.length === 1 ? 'Credenciales generadas' : `${credenciales.length} credenciales generadas`}
      </p>
      <ul className="mt-3 space-y-1.5">
        {credenciales.map((c) => (
          <li key={c.username} className="text-sm">
            <span className="font-mono font-medium text-foreground">{c.username}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="font-mono text-foreground">
              {c.estado === 'activa' ? 'ya tiene su propia contraseña' : c.password_temporal}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Anótalas ahora: <strong>la contraseña no se vuelve a mostrar</strong>. En la
        base solo queda cifrada, así que no hay forma de recuperarla — solo de
        generar otra. La persona la cambiará al entrar por primera vez.
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={alCerrar}>
        Ya las anoté
      </Button>
    </div>
  );
}

/** La ficha de solo lectura que se ve al hacer clic en una fila. */
function FichaAsistente({
  ficha,
  alEditar,
  alRestablecer,
}: {
  ficha: Ficha;
  alEditar: () => void;
  alRestablecer: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button size="sm" onClick={alEditar}>
          <Pencil /> Editar
        </Button>
        <Button size="sm" variant="outline" onClick={alRestablecer}>
          <KeyRound /> Restablecer contraseña
        </Button>
      </div>

      <Seccion titulo="Acceso">
        <Campo etiqueta="Usuario" valor={ficha.username} mono />
        <Campo
          etiqueta="Correo"
          // Si el correo es de los que generamos nosotros, no tiene sentido
          // mostrárselo al admin: la persona no lo conoce ni lo usa.
          valor={ficha.email_sintetico ? 'Sin correo (entra con su usuario)' : ficha.email}
        />
        <Campo
          etiqueta="Estado"
          valor={ficha.debe_cambiar_password
            ? 'Aún no ha entrado (contraseña temporal sin usar)'
            : 'Cuenta activa, ya puso su propia contraseña'}
        />
      </Seccion>

      <Seccion titulo="Datos personales">
        <Campo etiqueta="Nombres" valor={ficha.nombre} />
        <Campo etiqueta="Apellidos" valor={ficha.apellidos} />
        <Campo
          etiqueta="Documento"
          valor={ficha.numero_documento ? `${ficha.tipo_documento} ${ficha.numero_documento}` : null}
        />
        <Campo etiqueta="Teléfono" valor={ficha.telefono} />
        <Campo etiqueta="País" valor={ficha.pais} />
      </Seccion>

      <Seccion titulo="Perfil profesional">
        <Campo etiqueta="Cargo o especialidad" valor={ficha.cargo} />
        <Campo etiqueta="Empresa o institución" valor={ficha.empresa} />
      </Seccion>

      <Seccion titulo="Inscripciones">
        {ficha.inscripciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin inscripciones.</p>
        ) : (
          <ul className="space-y-2">
            {ficha.inscripciones.map((i) => (
              <li key={i.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm font-medium text-card-foreground">
                  {i.congreso.nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {i.tipo_suscripcion ?? 'sin tipo'} · {i.estado} · importado por{' '}
                  {i.origen === 'excel' ? 'Excel' : 'el panel'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Campo({
  etiqueta,
  valor,
  mono,
}: {
  etiqueta: string;
  valor?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-sm text-muted-foreground">{etiqueta}</span>
      <span
        className={`text-right text-sm ${valor ? 'text-card-foreground' : 'text-muted-foreground/60'} ${mono ? 'font-mono' : ''}`}
      >
        {valor || '—'}
      </span>
    </div>
  );
}

/** Edición de los datos de un asistente ya creado. */
function FormularioEdicion({
  ficha,
  alGuardar,
  alCancelar,
}: {
  ficha: Ficha;
  alGuardar: () => Promise<void>;
  alCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombres: ficha.nombre,
    apellidos: ficha.apellidos ?? '',
    tipo_documento: ficha.tipo_documento ?? 'CC',
    numero_documento: ficha.numero_documento ?? '',
    email: ficha.email_sintetico ? '' : ficha.email,
    telefono: ficha.telefono ?? '',
    cargo: ficha.cargo ?? '',
    empresa: ficha.empresa ?? '',
    pais: ficha.pais ?? '',
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

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiFetch('PATCH', `/asistentes/${ficha.id}`, {
        nombres: form.nombres,
        apellidos: form.apellidos,
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        // El correo solo se manda si el admin escribió uno: mandar cadena
        // vacía intentaría borrarlo en Supabase y fallaría.
        ...(form.email ? { email: form.email } : {}),
        telefono: form.telefono,
        cargo: form.cargo,
        empresa: form.empresa,
        pais: form.pais,
        ...(paisPorNombre(form.pais) ? { pais_codigo: paisPorNombre(form.pais)!.codigo } : {}),
      });
      await alGuardar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        El usuario <strong className="font-mono">{ficha.username}</strong> no se puede
        cambiar: ya está repartido y cambiarlo dejaría a la persona fuera sin que se
        entere.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="nombres">Nombres</Label>
        <Input {...campo('nombres')} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apellidos">Apellidos</Label>
        <Input {...campo('apellidos')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tipo_documento">Tipo de documento</Label>
          <SelectorBuscable
            id="tipo_documento"
            opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t, etiqueta: t }))}
            valor={form.tipo_documento}
            requerido
            alElegir={(v) => setForm((f) => ({ ...f, tipo_documento: v }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="numero_documento">Número</Label>
          <Input {...campo('numero_documento')} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input {...campo('email')} type="email" placeholder="Sin correo" />
        <p className="text-xs text-muted-foreground">
          Si pones uno, pasará a ser con lo que inicia sesión (en vez del usuario).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input {...campo('telefono')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cargo">Cargo o especialidad</Label>
        <Input {...campo('cargo')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="empresa">Empresa o institución</Label>
        <Input {...campo('empresa')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pais">País</Label>
        <SelectorBuscable
          id="pais"
          opciones={PAISES.map((p) => ({ valor: p.nombre, etiqueta: p.nombre, pista: p.codigo }))}
          valor={form.pais}
          requerido
          alElegir={(v) => setForm((f) => ({ ...f, pais: v }))}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

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

/** Alta de UN asistente a mano (para los rezagados que no venían en el Excel). */
function FormularioAsistente({
  congresoId,
  alCrear,
  alCancelar,
}: {
  congresoId: string;
  alCrear: (cred: Credencial) => Promise<void>;
  alCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombres: '', apellidos: '', tipo_documento: 'CC', numero_documento: '',
    tipo_suscripcion: '', email: '', telefono: '', cargo: '', empresa: '', pais: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function campo(k: keyof typeof form) {
    return {
      id: `nuevo-${k}`,
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const creado = await apiFetch<Credencial>('POST', `/congresos/${congresoId}/asistentes`, {
        nombres: form.nombres,
        ...(form.apellidos ? { apellidos: form.apellidos } : {}),
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        ...(form.tipo_suscripcion ? { tipo_suscripcion: form.tipo_suscripcion } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.telefono ? { telefono: form.telefono } : {}),
        ...(form.cargo ? { cargo: form.cargo } : {}),
        ...(form.empresa ? { empresa: form.empresa } : {}),
        ...(form.pais ? { pais: form.pais } : {}),
        ...(paisPorNombre(form.pais) ? { pais_codigo: paisPorNombre(form.pais)!.codigo } : {}),
      });
      await alCrear(creado);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear el asistente');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mb-6 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">
        El usuario y la contraseña temporal los genera Nexvio: no hay que inventarlos.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-nombres">Nombres</Label>
          <Input {...campo('nombres')} required placeholder="Juan Pablo" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-apellidos">Apellidos (opcional)</Label>
          <Input {...campo('apellidos')} placeholder="García Ruiz" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-tipo_documento">Tipo de documento</Label>
          <SelectorBuscable
            id="nuevo-tipo_documento"
            opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t, etiqueta: t }))}
            valor={form.tipo_documento}
            requerido
            alElegir={(v) => setForm((f) => ({ ...f, tipo_documento: v }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-numero_documento">Número</Label>
          <Input {...campo('numero_documento')} required placeholder="1020304050" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-tipo_suscripcion">Tipo de suscripción</Label>
          <Input {...campo('tipo_suscripcion')} placeholder="Miembro" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-cargo">Cargo (opcional)</Label>
          <Input {...campo('cargo')} placeholder="Médico internista" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-empresa">Empresa (opcional)</Label>
          <Input {...campo('empresa')} placeholder="Clínica Demo" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-pais">País (opcional)</Label>
          <SelectorBuscable
            id="nuevo-pais"
            opciones={PAISES.map((p) => ({ valor: p.nombre, etiqueta: p.nombre, pista: p.codigo }))}
            valor={form.pais}
            requerido
            alElegir={(v) => setForm((f) => ({ ...f, pais: v }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-telefono">Teléfono (opcional)</Label>
          <Input {...campo('telefono')} placeholder="3001234567" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nuevo-email">Correo (opcional)</Label>
          <Input {...campo('email')} type="email" placeholder="juan@ejemplo.com" />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear asistente'}
        </Button>
        <Button type="button" variant="outline" onClick={alCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}
