import {
  IsBoolean,
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

  /**
   * "Correr la agenda" (8.4): si la sesión cambia de hora de FIN, mover lo
   * mismo todas las sesiones de ese día que empezaban a partir del fin viejo.
   * Ej.: la charla pasa de terminar 10:30 a 11:00 -> todo lo que venía
   * después se corre 30 minutos. No es un campo de la tabla: es una orden.
   */
  @IsOptional()
  @IsBoolean()
  correr_siguientes?: boolean;
}
