import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { FORMATO_FECHA_HORA } from '../zona-horaria.util';

/** Tipos de bloque que puede tener la agenda (ver schema.prisma, Bloque 8.1). */
export const TIPOS_SESION = ['charla', 'break', 'taller', 'plenaria'] as const;

/**
 * Molde para CREAR una sesión dentro de un congreso
 * (cuerpo del POST /congresos/:congresoId/sesiones).
 * El congreso al que pertenece llega por la URL, no en el cuerpo.
 */
export class CrearSesionDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  // "2026-11-12T09:00" (SIN zona) = hora del LUGAR DEL EVENTO: el backend la
  // convierte con congreso.zona_horaria. Si trae zona ("Z", "-05:00") se
  // respeta tal cual. Siempre se guarda en UTC. Ver zona-horaria.util.ts.
  @Matches(FORMATO_FECHA_HORA, { message: '$property: usa el formato 2026-11-12T09:00 (hora del evento) o una fecha con zona' })
  inicio: string;

  @Matches(FORMATO_FECHA_HORA, { message: '$property: usa el formato 2026-11-12T09:00 (hora del evento) o una fecha con zona' })
  fin: string;

  @IsOptional()
  @IsString()
  sala?: string;

  // --- Agenda por día (Bloque 8.1, expuesto en la API desde el 8.4) -------
  // Si no se manda, la BD pone "charla".
  @IsOptional()
  @IsIn(TIPOS_SESION as unknown as string[])
  tipo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  // Desempate cuando dos cosas empiezan a la misma hora.
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
