'use client';

import { useCallback, useState } from 'react';
import { PanelProvider, usePanel } from '@/components/panel/panel-contexto';
import { BarraLateral } from '@/components/panel/barra-lateral';
import { Cabecera } from '@/components/panel/cabecera';
import { EsqueletoPagina } from '@/components/panel/encabezado-pagina';

/**
 * Layout del PANEL (menú lateral + cabecera).
 *
 * "(panel)" entre paréntesis es un *route group* de Next: agrupa pantallas para
 * darles un layout común SIN que el nombre aparezca en la URL. Es decir,
 * /congresos sigue siendo /congresos; simplemente ahora se pinta dentro de
 * este marco. /login queda fuera a propósito: no debe llevar menú.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PanelProvider>
      <Marco>{children}</Marco>
    </PanelProvider>
  );
}

/** Se separa del layout porque usePanel() solo funciona DENTRO del provider. */
function Marco({ children }: { children: React.ReactNode }) {
  const { cargando } = usePanel();
  // 8.7.h: en el celular el menú lateral es un cajón que abre el ☰.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  return (
    <div className="flex h-screen bg-background">
      <BarraLateral abierto={menuAbierto} alCerrar={cerrarMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Cabecera alAbrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 overflow-y-auto">
          {cargando ? <EsqueletoPagina /> : children}
        </main>
      </div>
    </div>
  );
}
