import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

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

  // --- Ficha del speaker (Bloque 8.1, expuesta en la API desde el 8.4) ----
  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  empresa?: string;

  // Nombre visible ("Colombia") y código ISO-3166 de 2 letras ("CO") para
  // que el front pinte la bandera.
  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_codigo?: string;

  // Para ordenar la vitrina de speakers en la app.
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
