import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** Tipos de documento que acepta el sistema (Colombia + extranjeros). */
export const TIPOS_DOCUMENTO = ['CC', 'CE', 'PA', 'TI', 'NIT'] as const;

/**
 * Molde para dar de alta UN asistente a mano desde el panel.
 *
 * Ojo con lo que NO está aquí: ni `username`, ni `password`, ni
 * `organizacion_id`. El usuario y la contraseña temporal los GENERA el backend
 * (si los pidiéramos, cada admin inventaría su propio formato y se acabaría el
 * JPGarcia), y la organización sale del tenant activo de la petición.
 */
export class CrearAsistenteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombres: string;

  // Opcional a proposito: el Excel lo llena otra gente y a veces llega sin
  // apellido (o la persona solo tiene nombre). El usuario se genera igual.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidos?: string;

  @IsIn(TIPOS_DOCUMENTO as unknown as string[])
  tipo_documento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  numero_documento: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipo_suscripcion?: string;

  // Si la persona SÍ tiene correo, lo usamos como su login real en vez del
  // correo sintético. Por eso es opcional.
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(120) cargo?: string;
  @IsOptional() @IsString() @MaxLength(120) empresa?: string;
  @IsOptional() @IsString() @MaxLength(80) pais?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_codigo?: string;
}

/**
 * Molde para EDITAR un asistente.
 *
 * Se puede corregir casi todo, porque los datos vienen de un Excel que llena
 * otra gente y los errores de dedo son la norma: un correo mal escrito, un
 * dígito de más en la cédula, el cargo equivocado.
 *
 * Lo ÚNICO que no se puede cambiar es el `username`: ya está impreso en la
 * escarapela o repartido por WhatsApp, y cambiarlo dejaría a la persona fuera
 * sin que nadie se entere. Si de verdad hace falta otro usuario, se borra la
 * inscripción y se vuelve a crear.
 */
export class ActualizarAsistenteDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) nombres?: string;
  @IsOptional() @IsString() @MaxLength(120) apellidos?: string;

  @IsOptional() @IsIn(TIPOS_DOCUMENTO as unknown as string[]) tipo_documento?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40) numero_documento?: string;

  // Cambiar el correo toca TAMBIEN la cuenta de Supabase Auth: es con lo que
  // la persona inicia sesion. El service se encarga de los dos lados.
  @IsOptional() @IsEmail() email?: string;

  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(120) cargo?: string;
  @IsOptional() @IsString() @MaxLength(120) empresa?: string;
  @IsOptional() @IsString() @MaxLength(80) pais?: string;
  @IsOptional() @IsString() @Length(2, 2) pais_codigo?: string;
}
