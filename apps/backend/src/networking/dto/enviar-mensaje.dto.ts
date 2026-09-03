import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Molde para enviar un mensaje de chat (POST /conexiones/:id/mensajes). */
export class EnviarMensajeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  texto: string;
}
