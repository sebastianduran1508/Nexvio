'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Diálogo de confirmación reutilizable.
 *
 * Se hizo propio en vez de usar el window.confirm() del navegador por dos
 * razones: el nativo no respeta los colores de la marca ni el modo oscuro, y
 * no se puede escribir un texto claro para cada caso. Lo vamos a reutilizar en
 * los bloques siguientes (borrar un usuario, borrar un speaker, enviar una
 * notificación push a todos…), que son acciones mucho menos reversibles que
 * cerrar sesión.
 */
export function DialogoConfirmar({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligroso = false,
  alConfirmar,
  alCancelar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** true pinta el botón en rojo (acciones destructivas). */
  peligroso?: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  // Escape cierra. Pequeño detalle de accesibilidad que se agradece.
  useEffect(() => {
    if (!abierto) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') alCancelar();
    }
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [abierto, alCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      // Clic en el fondo = cancelar. El stopPropagation de la tarjeta evita
      // que un clic DENTRO del diálogo lo cierre por accidente.
      onClick={alCancelar}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-card-foreground">{titulo}</h2>
        {mensaje && (
          <p className="mt-2 text-sm text-muted-foreground">{mensaje}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={alCancelar}>
            {textoCancelar}
          </Button>
          <Button
            size="sm"
            variant={peligroso ? 'destructive' : 'default'}
            onClick={alConfirmar}
            autoFocus
          >
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
