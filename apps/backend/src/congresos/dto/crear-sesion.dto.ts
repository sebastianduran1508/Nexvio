import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Molde para CREAR una sesión dentro de un congreso
 * (cuerpo del POST /congresos/:congresoId/sesiones).
 * El congreso al que pertenece llega por la URL, no en el cuerpo.
 */
export class CrearSesionDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  // Sesiones usan timestamp completo: "2026-09-01T09:00:00Z".
  @IsDateString()
  inicio: string;

  @IsDateString()
  fin: string;

  @IsOptional()
  @IsString()
  sala?: string;
}
