import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Datos del primer organizador (el "dueño" de la organización).
 * Va anidado dentro de CrearOrganizacionDto.
 */
export class OrganizadorInicialDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;
}

/**
 * Cuerpo del POST /organizaciones: la organización nueva + su primer organizador.
 */
export class CrearOrganizacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  // slug = identificador corto en la URL (minúsculas, números y guiones).
  // Ej: "universidad-el-bosque". Es único en todo el sistema.
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug solo admite minúsculas, números y guiones',
  })
  slug: string;

  // @ValidateNested + @Type le dicen al ValidationPipe que valide el objeto
  // anidado con las reglas de OrganizadorInicialDto (si no, lo ignoraría).
  @ValidateNested()
  @Type(() => OrganizadorInicialDto)
  organizador: OrganizadorInicialDto;
}
