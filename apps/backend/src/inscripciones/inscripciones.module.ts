import { Module } from '@nestjs/common';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesService } from './inscripciones.service';

/**
 * Modulo Inscripciones (Fase 4): el asistente se inscribe a un congreso y
 * consulta sus inscripciones; el staff ve la lista de inscritos.
 */
@Module({
  controllers: [InscripcionesController],
  providers: [InscripcionesService],
})
export class InscripcionesModule {}
