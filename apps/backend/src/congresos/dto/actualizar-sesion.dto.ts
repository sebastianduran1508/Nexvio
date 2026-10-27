import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { FORMATO_FECHA_HORA } from '../zona-horaria.util';
import { TIPOS_SESION } from './crear-sesion.dto';

/** Molde para ACTUALIZAR una sesión (PATCH). Todo opcional (actualización parcial). */
export class ActualizarSesionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  titulo?: string;

  @IsOptional()
  @Matches(FORMATO_FECHA_HORA, { message: '$property: usa el formato 2026-11-12T09:00 (hora del evento) o una fecha con zona' })
  inicio?: string;

  @IsOptional()
  @Matches(FORMATO_FECHA_HORA, { message: '$property: usa el formato 2026-11-12T09:00 (hora del evento) o una fecha con zona' })
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
