import { Module } from '@nestjs/common';
import { PreguntasController } from './preguntas.controller';
import { PreguntasService } from './preguntas.service';
import { EncuestasController } from './encuestas.controller';
import { EncuestasService } from './encuestas.service';
import { RealtimeModule } from '../realtime/realtime.module';

/**
 * Modulo de participacion en vivo (Fase 5): preguntas y (proximamente) encuestas.
 * En el Bloque 5.4 se le sumara el gateway de Socket.io para el tiempo real.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [PreguntasController, EncuestasController],
  providers: [PreguntasService, EncuestasService],
})
export class ParticipacionModule {}
