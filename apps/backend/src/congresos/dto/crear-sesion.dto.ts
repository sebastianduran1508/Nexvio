import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  // Timestamp completo con zona: "2026-09-01T09:00:00Z" o "...T09:00:00-05:00".
  // Se guarda en UTC.
  @IsDateString()
  inicio: string;

  @IsDateString()
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
