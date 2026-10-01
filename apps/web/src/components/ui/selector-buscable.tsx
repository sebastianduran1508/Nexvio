'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Opcion = { valor: string; etiqueta: string; pista?: string };

/**
 * Selector buscable (lo que en inglés se llama *combobox*).
 *
 * Se escribe para FILTRAR, pero el valor solo queda fijado al ELEGIR una
 * opción de la lista. Esa es la diferencia con un campo de texto normal, y es
 * justo lo que normaliza los datos: nadie puede guardar "bogota", "Bogotá D.C."
 * y "BOGOTA" como si fueran tres ciudades distintas.
 *
 * Si `permitirLibre` está activo, aparece abajo la opción "Usar «lo que
 * escribiste»" para los casos que la lista no cubre (p. ej. una ciudad de un
 * país del que no tenemos catálogo). Sigue siendo una elección explícita, no un
 * descuido.
 */
export function SelectorBuscable({
  id,
  opciones,
  valor,
  alElegir,
  placeholder = 'Escribe para buscar…',
  permitirLibre = false,
  deshabilitado = false,
  requerido = false,
}: {
  id?: string;
  opciones: Opcion[];
  /** El valor ya elegido (o '' si todavía no hay ninguno). */
  valor: string;
  alElegir: (valor: string) => void;
  placeholder?: string;
  permitirLibre?: boolean;
  deshabilitado?: boolean;
  requerido?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef<HTMLDivElement>(null);

  // Cuando el valor cambia desde fuera (p. ej. al cambiar de país se limpia
  // la ciudad), el texto del input tiene que seguirlo.
  useEffect(() => {
    const elegida = opciones.find((o) => o.valor === valor);
    setTexto(elegida ? elegida.etiqueta : valor);
  }, [valor, opciones]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierto(false);
        // Al salir sin elegir, devolvemos el input a lo último confirmado.
        const elegida = opciones.find((o) => o.valor === valor);
        setTexto(elegida ? elegida.etiqueta : valor);
      }
    }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [valor, opciones]);

  /** Normaliza para comparar sin tildes ni mayúsculas ("bogota" ~ "Bogotá"). */
  const sinTildes = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtradas = useMemo(() => {
    const q = sinTildes(texto.trim());
    if (!q) return opciones;
    return opciones.filter((o) => sinTildes(o.etiqueta).includes(q));
  }, [texto, opciones]);

  const textoEsNuevo =
    permitirLibre &&
    texto.trim().length > 0 &&
    !opciones.some((o) => sinTildes(o.etiqueta) === sinTildes(texto.trim()));

  function elegir(v: string) {
    alElegir(v);
    setAbierto(false);
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setResaltado((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Enter elige lo resaltado; NO envía el formulario sin querer.
      e.preventDefault();
      if (filtradas[resaltado]) elegir(filtradas[resaltado].valor);
      else if (textoEsNuevo) elegir(texto.trim());
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  }

  return (
    <div className="relative" ref={caja}>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={texto}
          disabled={deshabilitado}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
            setResaltado(0);
            if (valor) alElegir(''); // al reescribir, el valor deja de ser válido
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={teclas}
          aria-expanded={abierto}
          aria-autocomplete="list"
          role="combobox"
          className={cn(
            'h-9 w-full rounded-lg border border-border bg-background px-3 pr-16 text-sm text-foreground outline-none transition-colors',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            requerido && !valor && texto.trim().length > 0 && 'border-destructive',
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
          {valor && <Check className="h-4 w-4 text-primary" />}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </div>
        {valor && !deshabilitado && (
          <button
            type="button"
            aria-label="Limpiar"
            onClick={() => {
              alElegir('');
              setTexto('');
            }}
            className="absolute inset-y-0 right-8 flex items-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Aviso cuando se escribió algo pero no se eligió nada de la lista. */}
      {requerido && !valor && texto.trim().length > 0 && !abierto && (
        <p className="mt-1 text-xs text-destructive">
          Elige una opción de la lista.
        </p>
      )}

      {abierto && !deshabilitado && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {filtradas.map((o, i) => (
            <li key={o.valor}>
              <button
                type="button"
                role="option"
                aria-selected={o.valor === valor}
                onMouseEnter={() => setResaltado(i)}
                onClick={() => elegir(o.valor)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-card-foreground transition-colors',
                  i === resaltado && 'bg-muted',
                )}
              >
                <span className="truncate">{o.etiqueta}</span>
                {o.pista && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {o.pista}
                  </span>
                )}
              </button>
            </li>
          ))}

          {textoEsNuevo && (
            <li className="border-t border-border">
              <button
                type="button"
                onClick={() => elegir(texto.trim())}
                className="w-full px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-muted"
              >
                Usar «{texto.trim()}»
              </button>
            </li>
          )}

          {filtradas.length === 0 && !textoEsNuevo && (
            <li className="px-3 py-3 text-sm text-muted-foreground">
              Sin resultados.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
