'use client';

import { Handshake } from 'lucide-react';
import { ElegirCongreso } from '@/components/panel/elegir-congreso';

/** "Sponsors" del menú lateral: primero se elige el congreso. */
export default function SponsorsPage() {
  return (
    <ElegirCongreso
      titulo="Patrocinadores"
      descripcion="Elige el congreso cuyos patrocinadores quieres gestionar."
      seccion="sponsors"
      Icono={Handshake}
    />
  );
}
