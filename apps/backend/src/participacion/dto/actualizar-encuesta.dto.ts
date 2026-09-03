import { IsBoolean } from 'class-validator';

/** Molde para abrir/cerrar la votacion de una encuesta (PATCH /encuestas/:id). */
export class ActualizarEncuestaDto {
  @IsBoolean()
  activa: boolean;
}
