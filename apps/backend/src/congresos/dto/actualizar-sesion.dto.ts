import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TIPOS_SESION } from './crear-sesion.dto';

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

  @IsOptional()
  @IsIn(TIPOS_SESION as unknown as string[])
  tipo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
