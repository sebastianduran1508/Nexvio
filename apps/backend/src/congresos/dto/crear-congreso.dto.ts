import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

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

  // --- Datos del evento (Bloque 8.1/8.2) ---------------------------------
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  // ISO-3166 alpha-2 en mayusculas: "CO", "MX". Exactamente 2 letras.
  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_codigo?: string;

  @IsOptional()
  @IsString()
  lugar?: string;

  // Zona horaria IANA del evento ("America/Bogota"). Las sesiones se guardan
  // en UTC; esto dice en que horario hay que pintarlas.
  @IsOptional()
  @IsString()
  zona_horaria?: string;
}
