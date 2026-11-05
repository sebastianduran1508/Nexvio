import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { AccesoCongresoGuard, SoloInscritos } from '../acceso/acceso-congreso.guard';
import { AgendaService } from './agenda.service';

/**
 * Mi agenda (8.7.e):
 *   GET            /congresos/:congresoId/mi-agenda
 *   POST / DELETE  /sesiones/:sesionId/favorita
 * El portero de 8.7.b: un asistente solo marca charlas de SU congreso.
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard, AccesoCongresoGuard)
@Roles('organizador', 'coordinador', 'participante')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get('congresos/:congresoId/mi-agenda')
  @SoloInscritos('congreso', 'congresoId')
  miAgenda(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.agenda.miAgenda(orgId, usuarioId, congresoId);
  }

  @Post('sesiones/:sesionId/favorita')
  @SoloInscritos('sesion', 'sesionId')
  marcar(@OrgId() orgId: string, @UserId() usuarioId: string, @Param('sesionId', ParseUUIDPipe) sesionId: string) {
    return this.agenda.marcar(orgId, usuarioId, sesionId);
  }

  @Delete('sesiones/:sesionId/favorita')
  @SoloInscritos('sesion', 'sesionId')
  desmarcar(@OrgId() orgId: string, @UserId() usuarioId: string, @Param('sesionId', ParseUUIDPipe) sesionId: string) {
    return this.agenda.desmarcar(orgId, usuarioId, sesionId);
  }
}
