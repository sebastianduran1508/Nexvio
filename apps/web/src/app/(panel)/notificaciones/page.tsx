'use client';

import { Bell } from 'lucide-react';
import { ElegirCongreso } from '@/components/panel/elegir-congreso';

/** "Notificaciones" del menú lateral: primero se elige el congreso. */
export default function NotificacionesPage() {
  return (
    <ElegirCongreso
      titulo="Notificaciones"
      descripcion="Elige el congreso al que quieres enviar avisos."
      seccion="notificaciones"
      Icono={Bell}
    />
  );
}
