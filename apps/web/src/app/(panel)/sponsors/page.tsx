'use client';

import { ElegirCongreso } from '@/components/panel/elegir-congreso';

/** "Sponsors" del menú lateral: primero se elige el congreso. */
export default function SponsorsPage() {
  return (
    <ElegirCongreso
      titulo="Sponsors"
      descripcion="Elige el congreso cuyos patrocinadores quieres gestionar."
      seccion="sponsors"
    />
  );
}
