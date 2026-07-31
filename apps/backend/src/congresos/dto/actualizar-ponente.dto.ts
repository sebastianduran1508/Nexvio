import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
