'use client';

import { useState } from 'react';
import { Building2, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { SelectorOrganizacion } from './selector-organizacion';
import { DialogoConfirmar } from './dialogo-confirmar';
import { usePanel } from './panel-contexto';

const NOMBRE_ROL: Record<string, string> = {
  admin: 'Superadmin',
  organizador: 'Organizador',
  coordinador: 'Coordinador',
};

/** Botón cuadrado translúcido sobre el violeta de la barra. */
const BOTON =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.12] text-white transition-colors hover:bg-white/[0.22] focus-visible:outline-2 focus-visible:outline-white';

/**
 * Barra superior del panel (8.7.h: "Violeta vivo").
 *
 *   izquierda — ☰ (solo celular) y EN QUÉ ORGANIZACIÓN estás trabajando: el
 *               superadmin la elige aquí; el organizador ve la suya.
 *   derecha   — tu rol (chip coral), tema y cerrar sesión.
 *
 * Igual que el menú lateral, va siempre en violeta de marca.
 */
export function Cabecera({ alAbrirMenu }: { alAbrirMenu: () => void }) {
  const { claims, esSuperadmin, perfil, cerrarSesion } = usePanel();
  const [confirmando, setConfirmando] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const oscuro = resolvedTheme === 'dark';
  const rol = NOMBRE_ROL[claims?.rol ?? ''] ?? claims?.rol;

  return (
    <>
      <header className="fondo-marca-barra flex h-[68px] shrink-0 items-center gap-3 px-4 text-white md:px-8">
        <button type="button" onClick={alAbrirMenu} aria-label="Abrir menú" className={`${BOTON} md:hidden`}>
          <Menu className="h-5 w-5" />
        </button>

        {esSuperadmin ? (
          <SelectorOrganizacion />
        ) : (
          perfil?.organizacion?.nombre && (
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/20 bg-white/[0.12] px-3.5 py-1.5">
              <Building2 className="h-[18px] w-[18px] shrink-0" />
              <span className="min-w-0 leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/75">Organización</span>
                <span className="block max-w-[18rem] truncate text-sm font-bold">{perfil.organizacion.nombre}</span>
              </span>
            </div>
          )
        )}

        <div className="ml-auto flex items-center gap-2">
          {rol && (
            <span className="hidden rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-coral-foreground sm:inline">
              {rol}
            </span>
          )}
          <button
            type="button"
            className={BOTON}
            // Texto fijo a propósito: el servidor no sabe el tema (vive en el
            // navegador) y un texto que cambia con él rompe la hidratación.
            aria-label="Cambiar entre modo claro y oscuro"
            onClick={() => setTheme(oscuro ? 'light' : 'dark')}
          >
            <Sun className="hidden h-[18px] w-[18px] dark:block" />
            <Moon className="block h-[18px] w-[18px] dark:hidden" />
          </button>
          <button type="button" className={BOTON} aria-label="Cerrar sesión" onClick={() => setConfirmando(true)}>
            <LogOut className="h-[18px] w-[18px]" />
          </button>
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
