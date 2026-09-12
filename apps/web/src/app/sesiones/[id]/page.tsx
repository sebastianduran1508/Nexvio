'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import { apiFetch } from '@/lib/api';
import { crearSocket } from '@/lib/socket';
import { Input } from '@/components/ui/input';

type Pregunta = { id: string; texto: string; estado: string; usuario?: { nombre: string } };
type OpcionResultado = { id: string; texto: string; votos: number };
type Encuesta = {
  id: string;
  pregunta: string;
  activa: boolean;
  opciones: OpcionResultado[];
  total: number;
};

/**
 * Pantalla de moderacion en vivo de una sesion (rol staff):
 *  - Preguntas: ver TODAS y moderarlas (aprobar / rechazar / respondida).
 *  - Encuestas: crear, abrir/cerrar y ver resultados.
 * Se une a la sala de la sesion por Socket.io y refresca al oir los avisos, asi
 * lo que hace el asistente en el movil aparece aqui al instante (y viceversa).
 *
 * Nota de diseño: todos los colores salen de tokens (bg-card, text-foreground,
 * bg-primary, text-destructive...). Las barras y los badges de estado usan
 * fondos con opacidad (/15) para verse bien en claro y en oscuro.
 */
export default function SesionModeracionPage() {
  const params = useParams<{ id: string }>();
  const sesionId = params.id;

  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [errorDev, setErrorDev] = useState<string | null>(null);

  const cargarPreguntas = useCallback(async () => {
    try {
      setPreguntas(await apiFetch<Pregunta[]>('GET', `/sesiones/${sesionId}/preguntas`));
    } catch {}
  }, [sesionId]);
  const cargarEncuestas = useCallback(async () => {
    try {
      setEncuestas(await apiFetch<Encuesta[]>('GET', `/sesiones/${sesionId}/encuestas`));
    } catch {}
  }, [sesionId]);

  useEffect(() => {
    cargarPreguntas();
    cargarEncuestas();

    let socket: Socket | undefined;
    let activo = true;
    crearSocket().then((s) => {
      if (!activo) return s.disconnect();
      socket = s;
      s.emit('join_sesion', sesionId);
      s.on('preguntas:cambio', cargarPreguntas);
      s.on('encuestas:cambio', cargarEncuestas);
    });
    return () => {
      activo = false;
      if (socket) {
        socket.emit('leave_sesion', sesionId);
        socket.disconnect();
      }
    };
  }, [sesionId, cargarPreguntas, cargarEncuestas]);

  // Ejecuta una accion y, si falla, muestra un aviso SOLO en desarrollo
  // (en produccion se ignora silenciosamente; la UI sigue viva).
  async function ejecutar(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        setErrorDev(e?.message ?? 'Error');
      }
    }
  }
  async function moderar(id: string, estado: string) {
    await ejecutar(async () => {
      await apiFetch('PATCH', `/preguntas/${id}`, { estado });
      cargarPreguntas();
    });
  }
  async function alternar(enc: Encuesta) {
    await ejecutar(async () => {
      await apiFetch('PATCH', `/encuestas/${enc.id}`, { activa: !enc.activa });
      cargarEncuestas();
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <Link href="/congresos" className="text-sm text-primary">
        ‹ Congresos
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold text-foreground">Moderación en vivo</h1>

      {errorDev && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
          <span>⚠️ (solo en desarrollo) {errorDev}</span>
          <button onClick={() => setErrorDev(null)} className="font-semibold">✕</button>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* ------- PREGUNTAS ------- */}
        <section>
          <h2 className="mb-3 text-lg font-medium text-foreground">Preguntas</h2>
          {preguntas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay preguntas.</p>
          ) : (
            <ul className="space-y-3">
              {preguntas.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <p className="text-card-foreground">{p.texto}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{p.usuario?.nombre ?? 'Asistente'}</span>
                    <EstadoBadge estado={p.estado} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.estado !== 'aprobada' && p.estado !== 'respondida' && (
                      <Boton onClick={() => moderar(p.id, 'aprobada')} tono="primario">
                        Aprobar
                      </Boton>
                    )}
                    {p.estado === 'aprobada' && (
                      <Boton onClick={() => moderar(p.id, 'respondida')} tono="exito">
                        Marcar respondida
                      </Boton>
                    )}
                    {p.estado !== 'rechazada' && (
                      <Boton onClick={() => moderar(p.id, 'rechazada')} tono="peligro">
                        Rechazar
                      </Boton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------- ENCUESTAS ------- */}
        <section>
          <h2 className="mb-3 text-lg font-medium text-foreground">Encuestas</h2>
          <CrearEncuesta sesionId={sesionId} onCreada={cargarEncuestas} />

          <ul className="mt-4 space-y-3">
            {encuestas.map((e) => (
              <li key={e.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-card-foreground">{e.pregunta}</p>
                  <Boton onClick={() => alternar(e)} tono={e.activa ? 'peligro' : 'primario'}>
                    {e.activa ? 'Cerrar' : 'Abrir'}
                  </Boton>
                </div>
                <div className="mt-3 space-y-2">
                  {e.opciones.map((o) => {
                    const pct = e.total > 0 ? Math.round((o.votos / e.total) * 100) : 0;
                    return (
                      <div key={o.id}>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{o.texto}</span>
                          <span>{pct}% ({o.votos})</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {e.total} voto{e.total === 1 ? '' : 's'} · {e.activa ? 'abierta' : 'cerrada'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Formulario para crear una encuesta con opciones dinamicas. */
function CrearEncuesta({ sesionId, onCreada }: { sesionId: string; onCreada: () => void }) {
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState(['', '']);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setError(null);
    const limpias = opciones.map((o) => o.trim()).filter(Boolean);
    if (!pregunta.trim() || limpias.length < 2) {
      setError('Pon una pregunta y al menos 2 opciones.');
      return;
    }
    try {
      await apiFetch('POST', `/sesiones/${sesionId}/encuestas`, {
        pregunta: pregunta.trim(),
        opciones: limpias,
      });
      setPregunta('');
      setOpciones(['', '']);
      onCreada();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear');
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-3">
      <Input
        placeholder="Pregunta de la encuesta"
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
      />
      {opciones.map((o, i) => (
        <Input
          key={i}
          className="mt-2"
          placeholder={`Opción ${i + 1}`}
          value={o}
          onChange={(e) => {
            const copia = [...opciones];
            copia[i] = e.target.value;
            setOpciones(copia);
          }}
        />
      ))}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        {opciones.length < 6 && (
          <Boton onClick={() => setOpciones([...opciones, ''])} tono="neutro">
            + Opción
          </Boton>
        )}
        <Boton onClick={crear} tono="primario">
          Crear encuesta
        </Boton>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  // Fondos con opacidad para que funcionen en claro y oscuro.
  const colores: Record<string, string> = {
    pendiente: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    aprobada: 'bg-primary/15 text-primary',
    respondida: 'bg-green-500/15 text-green-600 dark:text-green-400',
    rechazada: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colores[estado] ?? 'bg-muted text-muted-foreground'}`}>
      {estado}
    </span>
  );
}

/**
 * Botón local de esta pantalla (distinto del <Button> de shadcn: aquí queremos
 * varios "tonos" semánticos para moderación). Todos salen de tokens salvo el
 * verde de "éxito", que es un color de estado intencional.
 */
function Boton({
  children,
  onClick,
  tono,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tono: 'primario' | 'exito' | 'peligro' | 'neutro';
}) {
  const estilos: Record<string, string> = {
    primario: 'bg-primary text-primary-foreground hover:bg-primary/90',
    exito: 'bg-green-600 text-white hover:bg-green-700',
    peligro: 'border border-destructive/30 text-destructive hover:bg-destructive/10',
    neutro: 'border border-border text-foreground hover:bg-muted',
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${estilos[tono]}`}
    >
      {children}
    </button>
  );
}
