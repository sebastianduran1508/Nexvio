import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Molde para CREAR un ponente dentro de un congreso
 * (cuerpo del POST /congresos/:congresoId/ponentes).
 */
export class CrearPonenteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  foto_url?: string;
}
