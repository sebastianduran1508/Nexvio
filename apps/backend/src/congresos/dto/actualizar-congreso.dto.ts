import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/**
 * Molde para ACTUALIZAR un congreso (cuerpo del PATCH /congresos/:id).
 * Todos los campos son opcionales: se manda solo lo que se quiere cambiar.
 * (Un PATCH es una actualización parcial; por eso todo va con @IsOptional).
 */
export class ActualizarCongresoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

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
