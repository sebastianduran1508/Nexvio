import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Molde de los datos para CREAR un congreso (cuerpo del POST /congresos).
 * Cada decorador es una regla que el ValidationPipe verifica ANTES de entrar
 * al controller. Si algo no cumple, responde 400 con un mensaje claro.
 */
export class CrearCongresoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  // "2026-09-01" — cadena de fecha ISO válida.
  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  // Opcional: si no se manda, la BD usa el default 'borrador'.
  @IsOptional()
  @IsIn(['borrador', 'publicado', 'archivado'])
  estado?: string;
}
