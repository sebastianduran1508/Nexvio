'use client';

import { Mic2 } from 'lucide-react';
import { ElegirCongreso } from '@/components/panel/elegir-congreso';

/** "Speakers" del menú lateral: primero se elige el congreso. */
export default function SpeakersPage() {
  return (
    <ElegirCongreso
      titulo="Speakers"
      descripcion="Elige el congreso cuyos ponentes quieres gestionar."
      seccion="speakers"
      Icono={Mic2}
    />
  );
}
