import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

/**
 * Los campos del perfil que el ASISTENTE puede cambiar (decisión 8.7: foto,
 * cargo, empresa, teléfono y país). Nombre y documento NO: vienen del Excel de
 * la organización y son su identidad.
 *
 * ⚠️ Para sumar un campo (si el cliente lo pide): agregarlo aquí, en
 * CAMPOS_EDITABLES y en el select de PerfilService. La app pinta el formulario
 * a partir de `editables`, así que no hay que tocar la pantalla para lo básico.
 *
 * Un texto vacío ("") significa "borrar el dato".
 */
export const CAMPOS_EDITABLES = [
  'cargo', 'empresa', 'telefono', 'pais', 'pais_codigo', 'descripcion',
  'contacto_email', 'linkedin_url', // 8.7.d: contacto para las conexiones
] as const;

/**
 * 8.7.c: además de los de texto, la EDAD, guardada solo como año de nacimiento
 * (minimización: no hace falta la fecha completa para mostrar "34 años").
 * Va aparte porque es un número (null = quitarla).
 */
export const CAMPOS_NUMERICOS = ['anio_nacimiento'] as const;
const ESTE_ANIO = new Date().getFullYear();

export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  empresa?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^\+?[\d\s()-]{7,20}$/, { message: 'El teléfono solo puede tener números, espacios, +, ( ) y -' })
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  pais?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Za-z]{2}$/, { message: 'El código de país son 2 letras (CO, MX…)' })
  pais_codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción puede tener hasta 500 caracteres' })
  descripcion?: string;

  // @IsOptional deja pasar null: así se QUITA la edad.
  @IsOptional()
  @IsInt({ message: 'El año de nacimiento es un número de 4 cifras' })
  @Min(1920, { message: 'Revisa el año de nacimiento' })
  @Max(ESTE_ANIO - 14, { message: 'Revisa el año de nacimiento' })
  anio_nacimiento?: number | null;

  // 8.7.d: contacto para las conexiones (solo lo ven si compartir_contacto).
  @IsOptional()
  @ValidateIf((o) => o.contacto_email !== '')
  @IsEmail({}, { message: 'Correo de contacto inválido' })
  @MaxLength(120)
  contacto_email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i, {
    message: 'Pega el enlace de tu perfil de LinkedIn (https://www.linkedin.com/in/…)',
  })
  @MaxLength(200)
  linkedin_url?: string;

  /** 8.7.d: "Compartir mi contacto con mis conexiones" (el principal)... */
  @IsOptional()
  @IsBoolean()
  compartir_contacto?: boolean;

  /** ...y cada dato por separado (consentimiento granular). */
  @IsOptional()
  @IsBoolean()
  compartir_telefono?: boolean;

  @IsOptional()
  @IsBoolean()
  compartir_correo?: boolean;

  @IsOptional()
  @IsBoolean()
  compartir_linkedin?: boolean;

  /** 8.7.d: interruptor "Aparecer en networking" (no va en `editables`: es un interruptor). */
  @IsOptional()
  @IsBoolean()
  visible_networking?: boolean;
}

export class CrearSolicitudDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
