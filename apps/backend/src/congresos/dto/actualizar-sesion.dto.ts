import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Molde para ACTUALIZAR una sesión (PATCH). Todo opcional (actualización parcial). */
export class ActualizarSesionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  titulo?: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fin?: string;

  @IsOptional()
  @IsString()
  sala?: string;
}
