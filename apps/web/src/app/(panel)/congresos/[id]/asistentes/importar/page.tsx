'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet,
  Info, UserPlus, Users,
} from 'lucide-react';
import { apiSubirArchivo, apiDescargar } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';

type EstadoFila = 'nueva' | 'se_inscribe' | 'ya_inscrita' | 'error';

type Fila = {
  fila: number;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  tipo_suscripcion?: string;
  estado: EstadoFila;
  motivo?: string;
  username_propuesto?: string;
};

type Analisis = {
  congreso: string;
  total: number;
  nuevas: number;
  se_inscriben: number;
  ya_inscritas: number;
  errores: number;
  filas: Fila[];
};

type Credencial = {
  nombres: string; apellidos: string; documento: string;
  username: string; password_temporal: string;
};

type Resultado = {
  congreso: string;
  creadas: number;
  inscritas_existentes: number;
  omitidas: number;
  fallidas: { fila: number; motivo: string }[];
  credenciales: Credencial[];
};

/** Cómo se pinta cada estado: color, etiqueta y qué significa. */
const ESTILO: Record<EstadoFila, { etiqueta: string; clase: string }> = {
  nueva: { etiqueta: 'se crea', clase: 'bg-primary/10 text-primary' },
  se_inscribe: { etiqueta: 'solo se inscribe', clase: 'bg-coral/15 text-coral' },
  ya_inscrita: { etiqueta: 'ya inscrita', clase: 'bg-muted text-muted-foreground' },
  error: { etiqueta: 'error', clase: 'bg-destructive/10 text-destructive' },
};

/**
 * Importación del Excel de inscritos, en DOS PASOS.
 *
 * Paso 1 (previsualizar): el servidor lee el archivo y dice qué pasaría. No
 * escribe nada. Paso 2 (confirmar): se vuelve a mandar el MISMO archivo y
 * ahora sí se ejecuta.
 *
 * ¿Por qué el archivo dos veces? Porque así el servidor no guarda nada entre
 * una petición y otra, y lo que se importa es exactamente lo que se
 * previsualizó: nadie puede manipular la lista por el camino.
 */
export default function ImportarPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const congresoId = params.id;
  const inputArchivo = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function previsualizar(f: File) {
    setError(null);
    setArchivo(f);
    setAnalisis(null);
    setTrabajando(true);
    try {
      setAnalisis(
        await apiSubirArchivo<Analisis>(
          `/congresos/${congresoId}/importacion/previsualizar`,
          f,
        ),
      );
    } catch (e: any) {
      setError(e.message ?? 'No se pudo leer el archivo');
      setArchivo(null);
    } finally {
      setTrabajando(false);
    }
  }

  async function confirmar() {
    if (!archivo) return;
    setError(null);
    setTrabajando(true);
    try {
      setResultado(
        await apiSubirArchivo<Resultado>(
          `/congresos/${congresoId}/importacion/confirmar`,
          archivo,
        ),
      );
    } catch (e: any) {
      setError(e.message ?? 'La importación falló');
    } finally {
      setTrabajando(false);
    }
  }

  function descargarCredenciales() {
    if (!resultado) return;
    apiDescargar(
      'POST',
      `/congresos/${congresoId}/importacion/credenciales.xlsx`,
      'credenciales-nexvio.xlsx',
      { congreso: resultado.congreso, credenciales: resultado.credenciales },
    ).catch((e) => setError(e.message));
  }

  // ------------------------------------------------------- PASO 3: terminado
  if (resultado) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6 md:p-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <h1 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
            Importación terminada
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{resultado.congreso}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Dato valor={resultado.creadas} texto="personas creadas" destacado />
            <Dato valor={resultado.inscritas_existentes} texto="ya existían: solo se inscribieron" />
            <Dato valor={resultado.omitidas} texto="omitidas" />
          </div>

          {resultado.fallidas.length > 0 && (
            <div className="mt-5 rounded-lg bg-destructive/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {resultado.fallidas.length} fila(s) fallaron
              </p>
              <ul className="mt-2 space-y-1 text-sm text-destructive">
                {resultado.fallidas.map((f) => (
                  <li key={f.fila}>Fila {f.fila}: {f.motivo}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.credenciales.length > 0 && (
            <div className="mt-6 rounded-lg border border-coral/40 bg-coral/5 p-4">
              <p className="font-medium text-foreground">
                Descarga las credenciales ahora
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Es la <strong>única vez</strong> que se pueden ver las contraseñas
                temporales: después solo queda su versión cifrada y no hay forma de
                recuperarlas (sí de generar otras). Guarda el archivo hasta repartirlas.
              </p>
              <Button className="mt-3" onClick={descargarCredenciales}>
                <Download /> Descargar Excel de credenciales
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-2">
            <Link
              href={`/congresos/${congresoId}/asistentes`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Ver los asistentes
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setResultado(null);
                setAnalisis(null);
                setArchivo(null);
              }}
            >
              Importar otro archivo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------- PASOS 1 y 2: subir y revisar
  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <Link
        href={`/congresos/${congresoId}/asistentes`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Asistentes
      </Link>

      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-foreground">
        Importar inscritos desde Excel
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sube el archivo que te envió la organización. Antes de crear nada vas a ver
        exactamente qué va a pasar con cada fila.
      </p>

      {/* --- zona de carga --- */}
      <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium text-foreground">
          {archivo ? archivo.name : 'Elige el archivo .xlsx'}
        </p>
        <input
          ref={inputArchivo}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) previsualizar(f);
          }}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant={archivo ? 'outline' : 'default'}
            onClick={() => inputArchivo.current?.click()}
            disabled={trabajando}
          >
            {archivo ? 'Cambiar archivo' : 'Elegir archivo'}
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              apiDescargar(
                'GET',
                `/congresos/${congresoId}/importacion/plantilla`,
                'plantilla-inscritos-nexvio.xlsx',
              ).catch((e) => setError(e.message))
            }
          >
            <Download /> Descargar plantilla
          </Button>
        </div>
      </div>

      {trabajando && !analisis && (
        <p className="mt-4 text-muted-foreground">Leyendo el archivo…</p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* --- vista previa --- */}
      {analisis && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-foreground">
            Esto es lo que va a pasar
          </h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Dato valor={analisis.nuevas} texto="se crean" Icono={UserPlus} destacado />
            <Dato valor={analisis.se_inscriben} texto="ya existen: solo se inscriben" Icono={Users} />
            <Dato valor={analisis.ya_inscritas} texto="ya inscritas: se omiten" Icono={Info} />
            <Dato valor={analisis.errores} texto="con error: se omiten" Icono={AlertTriangle} peligro />
          </div>

          {analisis.errores > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Las filas con error <strong>no se importan</strong>. Puedes continuar e
              importar el resto, o corregir el Excel y volver a subirlo.
            </p>
          )}

          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-medium">Fila</th>
                  <th className="px-3 py-2 font-medium">Persona</th>
                  <th className="px-3 py-2 font-medium">Documento</th>
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Qué pasará</th>
                </tr>
              </thead>
              <tbody>
                {analisis.filas.map((f) => (
                  <tr key={f.fila} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{f.fila}</td>
                    <td className="px-3 py-2 text-foreground">
                      {f.nombres} {f.apellidos}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {f.tipo_documento} {f.numero_documento || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {f.username_propuesto ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO[f.estado].clase}`}
                      >
                        {ESTILO[f.estado].etiqueta}
                      </span>
                      {f.motivo && (
                        <span className="ml-2 text-xs text-muted-foreground">{f.motivo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              onClick={confirmar}
              disabled={trabajando || analisis.nuevas + analisis.se_inscriben === 0}
            >
              {trabajando
                ? 'Importando…'
                : `Importar ${analisis.nuevas + analisis.se_inscriben} persona(s)`}
            </Button>
            <Button variant="outline" onClick={() => router.back()} disabled={trabajando}>
              Cancelar
            </Button>
            {analisis.nuevas + analisis.se_inscriben === 0 && (
              <span className="text-sm text-muted-foreground">
                No hay nada que importar en este archivo.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Dato({
  valor,
  texto,
  Icono,
  destacado,
  peligro,
}: {
  valor: number;
  texto: string;
  Icono?: React.ComponentType<{ className?: string }>;
  destacado?: boolean;
  peligro?: boolean;
}) {
  const color = peligro
    ? 'text-destructive'
    : destacado
      ? 'text-primary'
      : 'text-muted-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {Icono && <Icono className={`h-4 w-4 ${color}`} />}
      <p className="mt-1 text-2xl font-semibold text-card-foreground">{valor}</p>
      <p className="text-xs text-muted-foreground">{texto}</p>
    </div>
  );
}
