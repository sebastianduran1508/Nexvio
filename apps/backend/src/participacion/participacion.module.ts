import { Module } from '@nestjs/common';
import { PreguntasController } from './preguntas.controller';
import { PreguntasService } from './preguntas.service';
import { EncuestasController } from './encuestas.controller';
import { EncuestasService } from './encuestas.service';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Modulo de participacion en vivo (Fase 5): preguntas y (proximamente) encuestas.
 * En el Bloque 5.4 se le sumara el gateway de Socket.io para el tiempo real.
 */
@Module({
  controllers: [PreguntasController, EncuestasController],
  providers: [PreguntasService, EncuestasService, RealtimeGateway],
})
export class ParticipacionModule {}
