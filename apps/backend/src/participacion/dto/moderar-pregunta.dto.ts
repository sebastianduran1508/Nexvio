import { IsIn } from 'class-validator';

/** Molde para moderar una pregunta (PATCH /preguntas/:id). Solo el staff. */
export class ModerarPreguntaDto {
  @IsIn(['aprobada', 'rechazada', 'respondida'])
  estado: string;
}
