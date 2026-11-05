'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogoConfirmar } from '@/components/panel/dialogo-confirmar';
import { usePanel } from '@/components/panel/panel-contexto';
import { cn } from '@/lib/utils';
import { ChipTitulo } from '@/components/panel/encabezado-pagina';

type Articulo = {
  id: string;
  titulo: string;
  contenido: string;
  orden: number;
  publicado: boolean;
  actualizado_en: string;
};

/**
 * AYUDA DEL PANEL (Bloque 8.6.d).
 *
 * Para todos: a la izquierda los artículos (con buscador), a la derecha el
 * artículo elegido, ya formateado.
 *
 * Para el superadmin, además: crear, editar (con vista previa al lado), dejar
 * como borrador (solo él lo ve), reordenar y borrar.
 *
 * El texto se escribe en Markdown y se muestra con react-markdown, que NO
 * ejecuta HTML escrito dentro del texto: aunque alguien pegara un <script>,
 * se vería como texto. Seguro por diseño.
 */
export default function AyudaPage() {
  const { esSuperadmin } = usePanel();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Articulo | 'nuevo' | null>(null);
  const [aBorrar, setABorrar] = useState<Articulo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const lista = await apiFetch<Articulo[]>('GET', '/ayuda');
      setArticulos(lista);
      setElegido((actual) => (actual && lista.some((a) => a.id === actual) ? actual : lista[0]?.id ?? null));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar la ayuda');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // El buscador mira el título y el contenido, sin importar tildes ni mayúsculas.
  const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return q ? articulos.filter((a) => normalizar(`${a.titulo} ${a.contenido}`).includes(q)) : articulos;
  }, [articulos, busqueda]);

  const articulo = articulos.find((a) => a.id === elegido) ?? null;

  async function mover(a: Articulo, dir: -1 | 1) {
    const ids = articulos.map((x) => x.id);
    const i = ids.indexOf(a.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      setArticulos(await apiFetch<Articulo[]>('POST', '/ayuda/orden', { ids }));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo reordenar');
    }
  }

  async function borrar() {
    const a = aBorrar;
    setABorrar(null);
    if (!a) return;
    try {
      await apiFetch('DELETE', `/ayuda/${a.id}`);
      await cargar();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo borrar');
    }
  }

  // ---------------- Modo edición (solo superadmin) ----------------
  if (editando) {
    return (
      <Editor
        articulo={editando === 'nuevo' ? null : editando}
        alGuardar={async (id) => {
          setEditando(null);
          await cargar();
          setElegido(id);
        }}
        alCancelar={() => setEditando(null)}
      />
    );
  }

  return (
    <div className="contenido-panel">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">
          <ChipTitulo Icono={HelpCircle} /> Ayuda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cómo usar el panel de Nexvio, paso a paso.
            {esSuperadmin && ' Como superadmin, puedes editar esta guía.'}
          </p>
        </div>
        {esSuperadmin && (
          <Button size="sm" onClick={() => setEditando('nuevo')}>
            <Plus /> Nuevo artículo
          </Button>
        )}
      </header>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {cargando && <p className="text-muted-foreground">Cargando…</p>}

      {!cargando && articulos.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <BookOpen className="mx-auto h-8 w-8" />
          <p className="mt-2">Todavía no hay artículos de ayuda.</p>
        </div>
      )}

      {articulos.length > 0 && (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* ---------- Índice ---------- */}
          <aside className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en la ayuda…" className="pl-9" />
            </div>
            <ul className="space-y-1">
              {visibles.map((a) => (
                <li key={a.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setElegido(a.id)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      a.id === elegido ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <span className="truncate">{a.titulo}</span>
                    {!a.publicado && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        BORRADOR
                      </span>
                    )}
                  </button>
                  {esSuperadmin && !busqueda && (
                    <span className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" aria-label="Subir" onClick={() => mover(a, -1)} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label="Bajar" onClick={() => mover(a, 1)} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </li>
              ))}
              {visibles.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nada coincide con «{busqueda}».</li>}
            </ul>
          </aside>

          {/* ---------- Artículo ---------- */}
          {articulo && (
            <article className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-card-foreground">{articulo.titulo}</h2>
                {esSuperadmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditando(articulo)}>
                      <Pencil /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setABorrar(articulo)}>
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
              <Markdown texto={articulo.contenido} />
              <p className="mt-8 border-t border-border pt-3 text-xs text-muted-foreground">
                Última actualización:{' '}
                {new Date(articulo.actualizado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </article>
          )}
        </div>
      )}

      <DialogoConfirmar
        abierto={aBorrar !== null}
        titulo={`¿Borrar «${aBorrar?.titulo}»?`}
        mensaje="Los organizadores dejarán de verlo. Si solo quieres ocultarlo un tiempo, mejor déjalo como borrador."
        textoConfirmar="Borrar"
        peligroso
        alConfirmar={borrar}
        alCancelar={() => setABorrar(null)}
      />
    </div>
  );
}

/**
 * Markdown con los estilos del panel. Cada elemento (título, lista, enlace...)
 * se dibuja con nuestras clases, así combina con el modo claro y el oscuro.
 */
function Markdown({ texto }: { texto: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-card-foreground">
      <ReactMarkdown
        components={{
          h1: ({ node: _node, ...p }) => <h2 className="mt-6 font-[family-name:var(--font-space-grotesk)] text-xl font-bold" {...p} />,
          h2: ({ node: _node, ...p }) => <h3 className="mt-6 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold" {...p} />,
          h3: ({ node: _node, ...p }) => <h4 className="mt-4 font-semibold" {...p} />,
          p: ({ node: _node, ...p }) => <p className="text-muted-foreground" {...p} />,
          ul: ({ node: _node, ...p }) => <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground marker:text-primary" {...p} />,
          ol: ({ node: _node, ...p }) => <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground marker:font-semibold marker:text-primary" {...p} />,
          strong: ({ node: _node, ...p }) => <strong className="font-semibold text-card-foreground" {...p} />,
          em: ({ node: _node, ...p }) => <em className="text-card-foreground" {...p} />,
          a: ({ node: _node, ...p }) => <a className="font-medium text-primary underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer" {...p} />,
          code: ({ node: _node, ...p }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-card-foreground" {...p} />,
          blockquote: ({ node: _node, ...p }) => (
            <blockquote className="rounded-r-lg border-l-4 border-primary bg-primary/5 px-4 py-2 [&>p]:text-card-foreground" {...p} />
          ),
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}

/** Editor del superadmin: texto a la izquierda, vista previa a la derecha. */
function Editor({
  articulo,
  alGuardar,
  alCancelar,
}: {
  articulo: Articulo | null;
  alGuardar: (id: string) => Promise<void>;
  alCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(articulo?.titulo ?? '');
  const [contenido, setContenido] = useState(articulo?.contenido ?? '');
  const [publicado, setPublicado] = useState(articulo?.publicado ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const datos = { titulo: titulo.trim(), contenido, publicado };
      const r = articulo
        ? await apiFetch<Articulo>('PATCH', `/ayuda/${articulo.id}`, datos)
        : await apiFetch<Articulo>('POST', '/ayuda', datos);
      await alGuardar(r.id);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <div className="contenido-panel">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo-pagina">
        <ChipTitulo Icono={HelpCircle} />
          {articulo ? 'Editar artículo' : 'Nuevo artículo'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPublicado((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              publicado
                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                : 'border-amber-500/40 text-amber-700 dark:text-amber-400',
            )}
          >
            {publicado ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {publicado ? 'Publicado' : 'Borrador (solo tú lo ves)'}
          </button>
          <Button variant="outline" size="sm" onClick={alCancelar} disabled={guardando}>Cancelar</Button>
          <Button size="sm" onClick={guardar} disabled={guardando || !titulo.trim() || !contenido.trim()}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </header>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="mb-4 space-y-1.5">
        <Label htmlFor="ayuda-titulo">Título</Label>
        <Input id="ayuda-titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Cómo importar asistentes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ayuda-contenido">Contenido</Label>
          <textarea
            id="ayuda-contenido"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            maxLength={20000}
            spellCheck
            className="h-[60vh] w-full resize-none rounded-md border border-input bg-transparent p-3 font-mono text-sm leading-relaxed text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder={'## Un subtítulo\n\nUn párrafo con **negrita**.\n\n- Un punto\n- Otro punto'}
          />
          <p className="text-xs text-muted-foreground">
            <code className="rounded bg-muted px-1">## Subtítulo</code> ·{' '}
            <code className="rounded bg-muted px-1">**negrita**</code> ·{' '}
            <code className="rounded bg-muted px-1">*cursiva*</code> ·{' '}
            <code className="rounded bg-muted px-1">- lista</code> ·{' '}
            <code className="rounded bg-muted px-1">1. pasos</code> ·{' '}
            <code className="rounded bg-muted px-1">&gt; nota</code> ·{' '}
            <code className="rounded bg-muted px-1">[texto](https://…)</code>
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Vista previa</Label>
          <div className="h-[60vh] overflow-y-auto rounded-md border border-border bg-card p-5">
            {titulo && <h2 className="mb-3 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-card-foreground">{titulo}</h2>}
            {contenido ? <Markdown texto={contenido} /> : <p className="text-sm text-muted-foreground">Escribe a la izquierda y aquí verás cómo queda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
