import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

/** Molde para ACTUALIZAR un ponente (PATCH). Todo opcional (actualización parcial). */
export class ActualizarPonenteDto {
  /**
   * 8.7.d: la cuenta de la app de este speaker (un inscrito del congreso).
   * null = desvincular. @IsOptional deja pasar el null.
   */
  @IsOptional()
  @IsUUID('4', { message: 'Cuenta inválida' })
  usuario_id?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  foto_url?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_codigo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
