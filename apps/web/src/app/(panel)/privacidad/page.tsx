'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePanel } from '@/components/panel/panel-contexto';
import { cn } from '@/lib/utils';
import { ChipTitulo } from '@/components/panel/encabezado-pagina';

type Solicitud = {
  id: string;
  titular_nombre: string;
  tipo: string;
  motivo: string | null;
  estado: 'pendiente' | 'atendida' | 'rechazada';
  respuesta: string | null;
  creado_en: string;
  atendida_en: string | null;
  vence_en: string;
  usuario: {
    id: string;
    username: string | null;
    tipo_documento: string | null;
    numero_documento: string | null;
    suprimido_en: string | null;
    inscripciones: { congreso: { id: string; nombre: string } }[];
  } | null;
  atendida_por: { nombre: string; apellidos: string | null } | null;
};

type DatosLegales = {
  nombre: string;
  legal_razon_social: string | null;
  legal_nit: string | null;
  legal_direccion: string | null;
  legal_ciudad: string | null;
  legal_correo: string | null;
  legal_telefono: string | null;
  legal_area: string | null;
  legal_url_politica: string | null;
};

type Campo = keyof Omit<DatosLegales, 'nombre'>;

/** Los campos del formulario, con lo que pide la ley de cada uno. */
const CAMPOS: { campo: Campo; etiqueta: string; ayuda: string; ejemplo: string; obligatorio: boolean }[] = [
  { campo: 'legal_razon_social', etiqueta: 'Razón social', ayuda: 'El nombre legal de la organización.', ejemplo: 'Asociación Colombiana de … S.A.S.', obligatorio: true },
  { campo: 'legal_nit', etiqueta: 'NIT', ayuda: 'Identificación tributaria.', ejemplo: '900.123.456-7', obligatorio: true },
  { campo: 'legal_direccion', etiqueta: 'Dirección', ayuda: 'Dirección física de la organización.', ejemplo: 'Calle 100 # 10-20, oficina 501', obligatorio: true },
  { campo: 'legal_ciudad', etiqueta: 'Ciudad (domicilio)', ayuda: 'Ciudad donde tiene su domicilio.', ejemplo: 'Bogotá D.C.', obligatorio: true },
  { campo: 'legal_correo', etiqueta: 'Correo para datos personales', ayuda: 'Adonde los asistentes escriben sus consultas y reclamos.', ejemplo: 'datos@organizacion.org', obligatorio: true },
  { campo: 'legal_telefono', etiqueta: 'Teléfono', ayuda: 'Teléfono de contacto.', ejemplo: '601 555 1234', obligatorio: true },
  { campo: 'legal_area', etiqueta: 'Área que atiende', ayuda: 'Persona o área responsable de responder las solicitudes.', ejemplo: 'Atención al asociado', obligatorio: true },
  { campo: 'legal_url_politica', etiqueta: 'Enlace a su política completa (opcional)', ayuda: 'Si la organización ya tiene publicada su propia política de datos.', ejemplo: 'https://organizacion.org/politica-de-datos', obligatorio: false },
];

/**
 * PRIVACIDAD Y DATOS (Bloque 8.7.c2) — lo que la Ley 1581 le pide a la
 * organización como RESPONSABLE de los datos de sus asistentes.
 *
 *  - Solicitudes: la bandeja de los asistentes que pidieron suprimir sus
 *    datos, con el plazo legal (15 días hábiles). Se atiende SUPRIMIENDO
 *    (anonimizar: irreversible) o RECHAZANDO con una explicación.
 *  - Datos del responsable: razón social, NIT, contacto y área que atiende
 *    (art. 13 del Decreto 1377). Se insertan solos en la política que ve el
 *    asistente en la app.
 *
 * La pueden usar el organizador y el superadmin (dentro de una organización).
 */
export default function PrivacidadPage() {
  const { esSuperadmin, orgActual } = usePanel();
  const [pestana, setPestana] = useState<'solicitudes' | 'responsable'>('solicitudes');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sinOrg = esSuperadmin && !orgActual;

  const cargar = useCallback(async () => {
    if (sinOrg) return;
    try {
      setSolicitudes(await apiFetch<Solicitud[]>('GET', '/solicitudes-datos'));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las solicitudes');
    } finally {
      setCargando(false);
    }
  }, [sinOrg]);

  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');

  return (
    <div className="contenido-panel">
      <header className="mb-6">
        <h1 className="titulo-pagina">
          <ChipTitulo Icono={ShieldCheck} /> Privacidad y datos
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Tu organización es la <b>responsable</b> de los datos personales de sus asistentes (Ley 1581 de 2012).
          Aquí atiendes sus solicitudes y mantienes los datos que la ley exige mostrarles.
        </p>
      </header>

      {sinOrg ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Elige una organización en el selector de arriba para ver su privacidad.
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-1 border-b border-border">
            <BotonPestana activa={pestana === 'solicitudes'} onClick={() => setPestana('solicitudes')}>
              Solicitudes
              {pendientes.length > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                  {pendientes.length}
                </span>
              )}
            </BotonPestana>
            <BotonPestana activa={pestana === 'responsable'} onClick={() => setPestana('responsable')}>
              Datos del responsable
            </BotonPestana>
          </div>

          {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {pestana === 'solicitudes' ? (
            <Solicitudes lista={solicitudes} cargando={cargando} recargar={cargar} />
          ) : (
            <Responsable />
          )}
        </>
      )}
    </div>
  );
}

function BotonPestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px flex items-center border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
        activa ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

// ==========================================================================
// Pestaña 1 — Solicitudes
// ==========================================================================

/** Días calendario que faltan hasta la fecha (negativo = ya venció). */
function diasRestantes(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

function Solicitudes({ lista, cargando, recargar }: { lista: Solicitud[]; cargando: boolean; recargar: () => Promise<void> }) {
  const [accion, setAccion] = useState<{ tipo: 'suprimir' | 'rechazar'; s: Solicitud } | null>(null);

  const pendientes = lista.filter((s) => s.estado === 'pendiente');
  const porVencer = pendientes.filter((s) => diasRestantes(s.vence_en) <= 3);
  const resueltas = lista.filter((s) => s.estado !== 'pendiente');

  if (cargando) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Contador icono={Inbox} titulo="Pendientes" valor={pendientes.length} tono="primario" />
        <Contador icono={AlertTriangle} titulo="Vencen en 3 días o menos" valor={porVencer.length} tono={porVencer.length ? 'rojo' : 'gris'} />
        <Contador icono={CheckCircle2} titulo="Resueltas" valor={resueltas.length} tono="verde" />
      </div>

      <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        Una solicitud de supresión es un <b>reclamo</b>: la ley da <b>15 días hábiles</b> para responderla (art. 15,
        Ley 1581). La fecha límite que ves no descuenta festivos, así que siempre te deja un margen.
      </p>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Inbox className="mx-auto h-8 w-8" />
          <p className="mt-2">Ningún asistente ha pedido la supresión de sus datos.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {[...pendientes, ...resueltas].map((s) => (
            <TarjetaSolicitud key={s.id} s={s} onSuprimir={() => setAccion({ tipo: 'suprimir', s })} onRechazar={() => setAccion({ tipo: 'rechazar', s })} />
          ))}
        </ul>
      )}

      {accion && (
        <DialogoAtender
          tipo={accion.tipo}
          s={accion.s}
          alCerrar={() => setAccion(null)}
          alTerminar={async () => {
            setAccion(null);
            await recargar();
          }}
        />
      )}
    </div>
  );
}

function Contador({ icono: Icono, titulo, valor, tono }: { icono: React.ComponentType<{ className?: string }>; titulo: string; valor: number; tono: 'primario' | 'rojo' | 'verde' | 'gris' }) {
  const colores = {
    primario: 'bg-primary/10 text-primary',
    rojo: 'bg-destructive/10 text-destructive',
    verde: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    gris: 'bg-muted text-muted-foreground',
  }[tono];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={cn('grid h-10 w-10 place-items-center rounded-lg', colores)}>
        <Icono className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-card-foreground">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{titulo}</p>
      </div>
    </div>
  );
}

function TarjetaSolicitud({ s, onSuprimir, onRechazar }: { s: Solicitud; onSuprimir: () => void; onRechazar: () => void }) {
  const dias = diasRestantes(s.vence_en);
  const congresos = s.usuario?.inscripciones.map((i) => i.congreso.nombre) ?? [];
  const plazo =
    dias < 0
      ? { texto: `Venció hace ${-dias} día${dias === -1 ? '' : 's'}`, clase: 'bg-destructive text-white' }
      : dias <= 3
        ? { texto: `Vence en ${dias} día${dias === 1 ? '' : 's'} (${fechaCorta(s.vence_en)})`, clase: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' }
        : { texto: `Vence el ${fechaCorta(s.vence_en)} · quedan ${dias} días`, clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' };

  return (
    <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-card-foreground">
            {s.titular_nombre}
            {s.usuario?.username && <span className="ml-2 font-normal text-muted-foreground">@{s.usuario.username}</span>}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Supresión de datos · pedida el {fechaCorta(s.creado_en)}
            {s.usuario?.numero_documento && ` · ${s.usuario.tipo_documento ?? ''} ${s.usuario.numero_documento}`}
            {congresos.length > 0 && ` · ${congresos.join(', ')}`}
          </p>
        </div>
        {s.estado === 'pendiente' ? (
          <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', plazo.clase)}>
            <Clock className="h-3.5 w-3.5" /> {plazo.texto}
          </span>
        ) : s.estado === 'atendida' ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Datos suprimidos
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" /> Rechazada
          </span>
        )}
      </div>

      {s.motivo && (
        <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">“{s.motivo}”</blockquote>
      )}

      {s.estado === 'pendiente' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="destructive" onClick={onSuprimir}>
            <Trash2 /> Suprimir datos
          </Button>
          <Button size="sm" variant="outline" onClick={onRechazar}>
            <XCircle /> Rechazar
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {s.atendida_en && `Atendida el ${fechaCorta(s.atendida_en)}`}
          {s.atendida_por && ` por ${[s.atendida_por.nombre, s.atendida_por.apellidos].filter(Boolean).join(' ')}`}
          {s.respuesta && <> · Respuesta: “{s.respuesta}”</>}
        </p>
      )}
    </li>
  );
}

/** Diálogo para suprimir (con explicación de lo que pasa) o rechazar (con motivo). */
function DialogoAtender({ tipo, s, alCerrar, alTerminar }: { tipo: 'suprimir' | 'rechazar'; s: Solicitud; alCerrar: () => void; alTerminar: () => void }) {
  const [respuesta, setRespuesta] = useState('');
  const [confirmo, setConfirmo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suprimir = tipo === 'suprimir';
  const valido = suprimir ? confirmo : respuesta.trim().length >= 10;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [alCerrar]);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch('POST', `/solicitudes-datos/${s.id}/${tipo}`, respuesta.trim() ? { respuesta: respuesta.trim() } : {});
      alTerminar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo completar');
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={alCerrar}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-card-foreground">
          {suprimir ? `¿Suprimir los datos de ${s.titular_nombre}?` : `Rechazar la solicitud de ${s.titular_nombre}`}
        </h2>

        {suprimir ? (
          <>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>• Se borra su <b>cuenta</b>: ya no podrá entrar a la app.</li>
              <li>• Se borran sus <b>chats</b>, conexiones de networking, teléfonos registrados e <b>inscripciones</b>.</li>
              <li>• Su perfil queda como <b>“Asistente eliminado”</b>: sin documento, contacto, cargo, empresa ni foto.</li>
              <li>• Sus preguntas y votos se conservan para las estadísticas, pero <b>sin su nombre</b>.</li>
            </ul>
            <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              Esto no se puede deshacer.
            </p>
            <Label htmlFor="respuesta" className="mt-4 block">Mensaje para el titular (opcional)</Label>
            <textarea
              id="respuesta"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Tus datos fueron suprimidos."
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-card-foreground">
              <input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
              Entiendo que es irreversible.
            </label>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Solo se puede rechazar cuando existe un <b>deber legal o contractual</b> de conservar los datos. Explícale
              al titular el motivo: lo verá en su app.
            </p>
            <Label htmlFor="motivo" className="mt-4 block">Motivo del rechazo</Label>
            <textarea
              id="motivo"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ej.: debemos conservar tus datos para emitir tu certificado de asistencia."
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Mínimo 10 caracteres.</p>
          </>
        )}

        {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={alCerrar} disabled={enviando}>Cancelar</Button>
          <Button variant={suprimir ? 'destructive' : 'default'} onClick={enviar} disabled={!valido || enviando}>
            {enviando ? 'Guardando…' : suprimir ? 'Suprimir datos' : 'Rechazar solicitud'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Pestaña 2 — Datos del responsable
// ==========================================================================

function Responsable() {
  const [datos, setDatos] = useState<DatosLegales | null>(null);
  const [form, setForm] = useState<Record<Campo, string>>({} as Record<Campo, string>);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    apiFetch<DatosLegales>('GET', '/organizacion/datos-legales')
      .then((d) => {
        setDatos(d);
        setForm(Object.fromEntries(CAMPOS.map(({ campo }) => [campo, d[campo] ?? ''])) as Record<Campo, string>);
      })
      .catch((e) => setMensaje({ ok: false, texto: e.message ?? 'No se pudieron cargar los datos' }));
  }, []);

  const obligatorios = CAMPOS.filter((c) => c.obligatorio);
  const completos = obligatorios.filter((c) => (form[c.campo] ?? '').trim() !== '').length;
  const cambios = !!datos && CAMPOS.some(({ campo }) => (form[campo] ?? '') !== (datos[campo] ?? ''));

  // Así leerá el asistente la sección 1 de la política (misma lógica que el backend).
  const vistaPrevia = useMemo(() => {
    const f = (c: Campo) => (form[c] ?? '').trim();
    const org = f('legal_razon_social') || datos?.nombre || 'la organización';
    const id = [org, f('legal_nit') ? `NIT ${f('legal_nit')}` : ''].filter(Boolean).join(', ');
    const ubic = [f('legal_direccion'), f('legal_ciudad')].filter(Boolean).join(', ');
    const cont = [f('legal_correo') && `correo ${f('legal_correo')}`, f('legal_telefono') && `teléfono ${f('legal_telefono')}`].filter(Boolean).join(' · ');
    return (
      `Responsable del tratamiento: ${id}.` +
      (ubic ? ` Domicilio y dirección: ${ubic}.` : '') +
      (cont ? ` Contacto: ${cont}.` : '') +
      ` Área responsable de atender consultas y reclamos: ${f('legal_area') || 'el equipo organizador del congreso'}.`
    );
  }, [form, datos]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const d = await apiFetch<DatosLegales>('PATCH', '/organizacion/datos-legales', form);
      setDatos(d);
      setMensaje({ ok: true, texto: 'Guardado. La política que ven los asistentes ya muestra estos datos.' });
    } catch (e: any) {
      setMensaje({ ok: false, texto: e.message ?? 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  }

  if (!datos) {
    return mensaje ? <p className="text-sm text-destructive">{mensaje.texto}</p> : <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={guardar} className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Lo exige el <b>art. 13 del Decreto 1377 de 2013</b> (contenido mínimo de la política).
          </p>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              completos === obligatorios.length
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
            )}
          >
            {completos} de {obligatorios.length} datos obligatorios
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map(({ campo, etiqueta, ayuda, ejemplo }) => (
            <div key={campo} className={cn('space-y-1.5', (campo === 'legal_url_politica' || campo === 'legal_razon_social') && 'sm:col-span-2')}>
              <Label htmlFor={campo}>{etiqueta}</Label>
              <Input
                id={campo}
                value={form[campo] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                placeholder={ejemplo}
                type={campo === 'legal_correo' ? 'email' : campo === 'legal_url_politica' ? 'url' : 'text'}
              />
              <p className="text-xs text-muted-foreground">{ayuda}</p>
            </div>
          ))}
        </div>

        {mensaje && (
          <p className={cn('rounded-lg px-3 py-2 text-sm', mensaje.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>
            {mensaje.texto}
          </p>
        )}

        <Button type="submit" disabled={!cambios || guardando}>
          <Save /> {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>

      <aside className="h-fit rounded-xl border border-border bg-muted/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Así lo verá el asistente</p>
        <p className="mt-1 text-sm font-semibold text-foreground">1. Responsable y encargado</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{vistaPrevia}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Nexvio actúa como encargado: presta la plataforma tecnológica y trata los datos solo por cuenta del responsable.
        </p>
        {completos < obligatorios.length && (
          <p className="mt-4 flex gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Mientras falten datos, la política que ven los asistentes está incompleta frente a la ley.
          </p>
        )}
      </aside>
    </div>
  );
}
