import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

/**
 * Datos legales del RESPONSABLE (8.7.c; Decreto 1377, art. 13). Los editan el
 * organizador y el superadmin. Un texto vacío ("") borra el dato.
 */
export class DatosLegalesDto {
  @IsOptional() @IsString() @MaxLength(160)
  legal_razon_social?: string;

  @IsOptional() @IsString() @Matches(/^$|^[\d.\- ]{5,20}$/, { message: 'NIT inválido (solo números, puntos y guion)' })
  legal_nit?: string;

  @IsOptional() @IsString() @MaxLength(160)
  legal_direccion?: string;

  @IsOptional() @IsString() @MaxLength(80)
  legal_ciudad?: string;

  @IsOptional() @ValidateIf((o) => o.legal_correo !== '') @IsEmail({}, { message: 'Correo inválido' })
  legal_correo?: string;

  @IsOptional() @IsString() @Matches(/^$|^\+?[\d\s()-]{7,20}$/, { message: 'Teléfono inválido' })
  legal_telefono?: string;

  @IsOptional() @IsString() @MaxLength(120)
  legal_area?: string;

  @IsOptional()
  @ValidateIf((o) => o.legal_url_politica !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'La dirección debe empezar por https://' })
  legal_url_politica?: string;
}

/** Al RECHAZAR, la ley exige explicarle al titular por qué. */
export class RechazarSolicitudDto {
  @IsString()
  @MinLength(10, { message: 'Explícale al titular el motivo (mínimo 10 caracteres)' })
  @MaxLength(1000)
  respuesta: string;
}

export class AtenderSolicitudDto {
  @IsOptional() @IsString() @MaxLength(1000)
  respuesta?: string;
}
