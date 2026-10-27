import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Módulo de Storage. Se exporta para que cualquier módulo que necesite subir
 * imágenes (Congresos en el 8.4, Sponsors y Personalización en el 8.5) lo importe.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
