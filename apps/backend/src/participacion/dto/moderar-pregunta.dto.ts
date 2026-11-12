import { IsIn } from 'class-validator';

/** Molde para moderar una pregunta (PATCH /preguntas/:id). Solo el staff. */
export class ModerarPreguntaDto {
  // Decisión 39 (8.10): ya no existe "aprobar". 'pendiente' sirve para deshacer
  // (volver a pendiente una respondida o una descartada por error).
  @IsIn(['pendiente', 'respondida', 'rechazada'])
  estado: string;
}
