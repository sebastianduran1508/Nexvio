import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

/** Molde para ACTUALIZAR un ponente (PATCH). Todo opcional (actualización parcial). */
export class ActualizarPonenteDto {
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
