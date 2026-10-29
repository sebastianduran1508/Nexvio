import { Module } from '@nestjs/common';
import { CongresosController } from './congresos.controller';
import { CongresosService } from './congresos.service';
import { SesionesController } from './sesiones.controller';
import { SesionesService } from './sesiones.service';
import { PonentesController } from './ponentes.controller';
import { PonentesService } from './ponentes.service';
import { StorageModule } from '../storage/storage.module';
import { PersonalizacionController } from './personalizacion.controller';
import { PersonalizacionService } from './personalizacion.service';

/**
 * Módulo Congresos (Fase 3): agrupa las tres piezas del dominio —
 * congresos, su agenda (sesiones) y sus ponentes— cada una con su
 * controller (rutas) y su service (lógica).
 */
@Module({
  // StorageModule: la foto de los ponentes (8.4.d) y el logo/portada del congreso (8.5.c).
  imports: [StorageModule],
  controllers: [CongresosController, SesionesController, PonentesController, PersonalizacionController],
  providers: [CongresosService, SesionesService, PonentesService, PersonalizacionService],
})
export class CongresosModule {}
