'use client';

import { Users } from 'lucide-react';
import { ElegirCongreso } from '@/components/panel/elegir-congreso';

/**
 * "Asistentes" del menú lateral (antes "Usuarios"; decisión 41).
 *
 * Los asistentes se gestionan POR CONGRESO (la inscripción y el tipo de
 * suscripción son de cada evento), así que esta pantalla solo pregunta en cuál
 * quieres trabajar y te manda allí. Si la organización tiene un solo congreso,
 * entra directo. 8.7.h: usa el mismo selector con tarjetas que Agenda,
 * Speakers, Sponsors y Notificaciones.
 */
export default function UsuariosPage() {
  return (
    <ElegirCongreso
      titulo="Asistentes"
      descripcion="Elige el congreso cuyos asistentes quieres gestionar."
      seccion="asistentes"
      Icono={Users}
    />
  );
}
