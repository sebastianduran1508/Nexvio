import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { FORMATO_FECHA_HORA } from '../../congresos/zona-horaria.util';

/**
 * Molde para crear un aviso (POST /congresos/:congresoId/notificaciones).
 *
 * Los límites de largo son los de una notificación que se lee bien en la
 * pantalla bloqueada del teléfono: título corto, cuerpo de 2–3 líneas.
 */
export class CrearNotificacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(65)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  cuerpo: string;

  /**
   * "todos" = aviso general del congreso. "sesion" = aviso SOBRE una charla
   * (cambio de sala, empieza en 5 min...). Hoy los dos llegan a todos los
   * inscritos: todavía no existe "a qué charlas va cada quien". El de sesión
   * lleva el id para que la app pueda abrir esa charla.
   */
  @IsOptional()
  @IsIn(['todos', 'sesion'])
  destino?: string;

  @IsOptional()
  @IsUUID()
  sesion_id?: string;

  /**
   * Si viene, el aviso se PROGRAMA. Mismo formato que la agenda (8.4):
   * "2026-11-12T08:45" = hora del lugar del evento, o una fecha con zona.
   */
  @IsOptional()
  @Matches(FORMATO_FECHA_HORA, {
    message: 'programada_para: usa el formato 2026-11-12T08:45 (hora del evento) o una fecha con zona',
  })
  programada_para?: string;
}

/** Molde para registrar el teléfono del asistente (POST /dispositivos). */
export class RegistrarDispositivoDto {
  // Los tokens de Expo tienen esta forma: ExponentPushToken[xxxxxxxx]
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/, {
    message: 'expo_push_token no tiene el formato de Expo',
  })
  expo_push_token: string;

  @IsOptional()
  @IsIn(['android', 'ios'])
  plataforma?: string;
}
