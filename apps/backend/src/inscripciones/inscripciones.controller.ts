import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';

/**
 * Rutas del Modulo Inscripciones (Fase 4).
 *
 *  - El asistente se inscribe / cancela A SI MISMO:
 *      POST   /congresos/:congresoId/inscripciones
 *      GET    /inscripciones/mias
 *      DELETE /inscripciones/:id           (solo la propia)
 *
 *  - El staff ve quien esta inscrito en un congreso:
 *      GET    /congresos/:congresoId/inscripciones
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class InscripcionesController {
  constructor(private readonly inscripciones: InscripcionesService) {}

  // Cualquier rol del tenant puede inscribirse a si mismo (el asistente es
  // 'participante', pero el staff tambien puede registrarse a un congreso).
  @Post('congresos/:congresoId/inscripciones')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  inscribir(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.inscripciones.inscribir(orgId, usuarioId, congresoId);
  }

  @Get('inscripciones/mias')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  mias(@OrgId() orgId: string, @UserId() usuarioId: string) {
    return this.inscripciones.mias(orgId, usuarioId);
  }

  @Delete('inscripciones/:id')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  cancelar(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inscripciones.cancelar(orgId, usuarioId, id);
  }

  // Ver la lista de inscritos es cosa del staff, no del participante.
  @Get('congresos/:congresoId/inscripciones')
  @Roles('admin', 'organizador', 'coordinador')
  listarDeCongreso(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.inscripciones.listarDeCongreso(orgId, congresoId);
  }
}
