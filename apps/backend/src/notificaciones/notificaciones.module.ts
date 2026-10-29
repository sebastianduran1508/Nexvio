import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { ExpoPushService } from './expo-push.service';
import { ProgramadorService } from './programador.service';

/** Avisos push de cada congreso + el programador (Bloque 8.6). */
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService, ExpoPushService, ProgramadorService],
})
export class NotificacionesModule {}
