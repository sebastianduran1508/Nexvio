import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
