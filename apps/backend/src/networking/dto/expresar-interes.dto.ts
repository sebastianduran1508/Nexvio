import { IsUUID } from 'class-validator';

/** Molde para marcar interes en otro asistente (POST /congresos/:id/intereses). */
export class ExpresarInteresDto {
  @IsUUID()
  receptor_id: string;
}
