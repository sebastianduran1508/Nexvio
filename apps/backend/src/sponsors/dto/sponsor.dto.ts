import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Niveles de patrocinio, del más importante al menos. El ORDEN de esta lista
 * es el orden en que se muestran (Oro primero) en el panel y en la app.
 */
export const NIVELES_SPONSOR = ['oro', 'plata', 'bronce', 'general'] as const;

/** Molde para CREAR un sponsor (POST /congresos/:congresoId/sponsors). */
export class CrearSponsorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  // Se acepta "www.empresa.com" y el service le pone "https://" si falta:
  // así el admin no tiene que saber qué es un protocolo.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sitio_web?: string | null;

  @IsOptional()
  @IsIn(NIVELES_SPONSOR as unknown as string[])
  nivel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

/** Molde para EDITAR un sponsor (PATCH /sponsors/:id). Todo opcional. */
export class ActualizarSponsorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  sitio_web?: string | null;

  @IsOptional()
  @IsIn(NIVELES_SPONSOR as unknown as string[])
  nivel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

/**
 * Molde para REORDENAR (POST /congresos/:congresoId/sponsors/orden).
 * El panel manda los ids de un nivel en el orden nuevo; el backend pone
 * orden = 0, 1, 2... Así las flechas ↑↓ se resuelven con una sola llamada.
 */
export class OrdenarSponsorsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids: string[];
}
