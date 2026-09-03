import { IsUUID } from 'class-validator';

/** Molde para votar (POST /encuestas/:id/votar). */
export class VotarDto {
  @IsUUID()
  opcion_id: string;
}
