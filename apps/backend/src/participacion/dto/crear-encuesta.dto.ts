import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

/** Molde para crear una encuesta con sus opciones (POST /sesiones/:id/encuestas). */
export class CrearEncuestaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  pregunta: string;

  // Entre 2 y 6 opciones de texto.
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  opciones: string[];
}
