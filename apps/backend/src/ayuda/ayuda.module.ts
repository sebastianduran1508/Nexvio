import { Module } from '@nestjs/common';
import { AyudaController } from './ayuda.controller';
import { AyudaService } from './ayuda.service';

/** Ayuda del panel, editable por el superadmin (Bloque 8.6.d). */
@Module({
  controllers: [AyudaController],
  providers: [AyudaService],
})
export class AyudaModule {}
