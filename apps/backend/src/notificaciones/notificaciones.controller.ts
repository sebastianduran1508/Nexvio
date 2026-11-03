import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { NotificacionesService } from './notificaciones.service';
import { CrearNotificacionDto, RegistrarDispositivoDto } from './dto/notificacion.dto';
import { AccesoCongresoGuard, SoloInscritos } from '../acceso/acceso-congreso.guard';

/**
 * Rutas de avisos y dispositivos (Bloque 8.6):
 *   POST   /congresos/:congresoId/notificaciones   crear (enviar ya o programar)
 *   GET    /congresos/:congresoId/notificaciones   historial (panel)
 *   GET    /congresos/:congresoId/avisos           bandeja de la app (solo enviados)
 *   DELETE /notificaciones/:id                     cancelar un programado
 *   POST   /dispositivos                           registrar el teléfono (app)
 *   POST   /dispositivos/desactivar                al cerrar sesión (app)
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard, AccesoCongresoGuard)
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Post('congresos/:congresoId/notificaciones')
  @Roles('admin', 'organizador')
  crear(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: CrearNotificacionDto,
  ) {
    return this.notificaciones.crear(orgId, usuarioId, congresoId, dto);
  }

  @Get('congresos/:congresoId/notificaciones')
  @Roles('admin', 'organizador', 'coordinador')
  listar(@OrgId() orgId: string, @Param('congresoId', ParseUUIDPipe) congresoId: string) {
    return this.notificaciones.listar(orgId, congresoId);
  }

  @Get('congresos/:congresoId/avisos')
  @SoloInscritos('congreso', 'congresoId')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  avisos(@OrgId() orgId: string, @Param('congresoId', ParseUUIDPipe) congresoId: string) {
    return this.notificaciones.avisos(orgId, congresoId);
  }

  @Delete('notificaciones/:id')
  @Roles('admin', 'organizador')
  cancelar(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificaciones.cancelar(orgId, id);
  }

  @Post('dispositivos')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  registrar(@OrgId() orgId: string, @UserId() usuarioId: string, @Body() dto: RegistrarDispositivoDto) {
    return this.notificaciones.registrarDispositivo(orgId, usuarioId, dto);
  }

  @Post('dispositivos/desactivar')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  desactivar(@OrgId() orgId: string, @UserId() usuarioId: string, @Body() dto: RegistrarDispositivoDto) {
    return this.notificaciones.desactivarDispositivo(orgId, usuarioId, dto.expo_push_token);
  }
}
