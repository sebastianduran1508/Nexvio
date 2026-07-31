import { Module } from '@nestjs/common';
import { CongresosController } from './congresos.controller';
import { CongresosService } from './congresos.service';
import { SesionesController } from './sesiones.controller';
import { SesionesService } from './sesiones.service';
import { PonentesController } from './ponentes.controller';
import { PonentesService } from './ponentes.service';

/**
 * Módulo Congresos (Fase 3): agrupa las tres piezas del dominio —
 * congresos, su agenda (sesiones) y sus ponentes— cada una con su
 * controller (rutas) y su service (lógica).
 */
@Module({
  controllers: [CongresosController, SesionesController, PonentesController],
  providers: [CongresosService, SesionesService, PonentesService],
})
export class CongresosModule {}
