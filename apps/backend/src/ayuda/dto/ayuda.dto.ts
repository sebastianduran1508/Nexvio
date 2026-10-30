import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Crear un artículo de ayuda (solo superadmin). */
export class CrearArticuloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  titulo: string;

  // Markdown. 20.000 caracteres es un artículo MUY largo: de sobra.
  @IsString()
  @MaxLength(20000)
  contenido: string;

  @IsOptional()
  @IsBoolean()
  publicado?: boolean;
}

/** Editar un artículo. Todo opcional. */
export class ActualizarArticuloDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  contenido?: string;

  @IsOptional()
  @IsBoolean()
  publicado?: boolean;
}

/** Reordenar: los ids de TODOS los artículos en el orden nuevo. */
export class OrdenarArticulosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids: string[];
}
