'use client';

import { ElegirCongreso } from '@/components/panel/elegir-congreso';

/** "Agenda" del menú lateral: primero se elige el congreso. */
export default function AgendaPage() {
  return (
    <ElegirCongreso
      titulo="Agenda"
      descripcion="Elige el congreso cuya agenda quieres organizar."
      seccion="agenda"
    />
  );
}
