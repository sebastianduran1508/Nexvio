import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Molde para enviar una pregunta a una sesion (POST /sesiones/:id/preguntas). */
export class CrearPreguntaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  texto: string;
}
