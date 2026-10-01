import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Molde para CREAR un usuario del tenant (cuerpo de POST /usuarios).
 * La organizacion NO va aqui: sale del tenant activo de la peticion (@OrgId()).
 *
 * Sobre el campo `rol` (Bloque 8.2):
 *  - Por defecto se crea un 'participante' (asistente).
 *  - Un ORGANIZADOR puede crear ademas 'coordinador'.
 *  - Solo el SUPERADMIN puede crear 'organizador' (el admin del congreso).
 * La lista de aqui es el primer filtro (formato); quien puede crear que rol lo
 * decide el service, que si sabe quien esta pidiendo. Nunca se puede crear un
 * 'admin' por esta via: el superadmin se siembra una sola vez con un script.
 */
export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  // Contrasena inicial de la cuenta de login (Supabase Auth exige >= 6).
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsIn(['participante', 'coordinador', 'organizador'])
  rol?: string;
}
