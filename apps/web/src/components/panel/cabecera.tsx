'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { SelectorOrganizacion } from './selector-organizacion';
import { DialogoConfirmar } from './dialogo-confirmar';
import { usePanel } from './panel-contexto';

/**
 * Cabecera del panel, en tres zonas:
 *   izquierda — quién eres
 *   centro    — EN QUÉ ORGANIZACIÓN estás trabajando (lo más importante para
 *               el superadmin: si no lo tiene presente, puede editar el
 *               congreso del cliente equivocado)
 *   derecha   — tema y cerrar sesión
 *
 * Aquí vive el ModeToggle (antes era un botón flotante provisional del 8.0).
 */
export function Cabecera() {
  const { claims, esSuperadmin, cerrarSesion } = usePanel();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border bg-background px-4 md:px-6">
        {/* izquierda */}
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {claims?.email}
            {claims?.rol && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                {esSuperadmin ? 'superadmin' : claims.rol}
              </span>
            )}
          </p>
        </div>

        {/* centro — solo aparece para el superadmin */}
        <div className="justify-self-center">
          <SelectorOrganizacion />
        </div>

        {/* derecha */}
        <div className="flex items-center justify-end gap-2">
          <ModeToggle />
          <Button
            variant="outline"
            size="icon"
            aria-label="Cerrar sesión"
            onClick={() => setConfirmando(true)}
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <DialogoConfirmar
        abierto={confirmando}
        titulo="¿Cerrar sesión?"
        mensaje="Tendrás que volver a entrar con tu usuario y contraseña."
        textoConfirmar="Cerrar sesión"
        alConfirmar={cerrarSesion}
        alCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
