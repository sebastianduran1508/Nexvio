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
 * Lo usa el staff para dar de alta asistentes (y opcionalmente coordinadores).
 * La organizacion NO va aqui: sale del token del que hace la peticion (@OrgId()).
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

  // Por defecto se crea un 'participante' (asistente). Un organizador puede
  // ademas crear 'coordinador'. NO puede crear otros organizadores ni admins
  // desde aqui (seguridad: evitar escalar privilegios).
  @IsOptional()
  @IsIn(['participante', 'coordinador'])
  rol?: string;
}
