import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';

/**
 * Rutas de la agenda (sesiones) y de la asignación de ponentes a sesiones.
 *
 * Fíjate en las rutas:
 *  - Las sesiones se CREAN y LISTAN colgando de un congreso:
 *      POST/GET  /congresos/:congresoId/sesiones
 *  - Pero se EDITAN/BORRAN por su propio id (ya no hace falta el congreso):
 *      PATCH/DELETE  /sesiones/:id
 *  - Asignar/quitar un ponente de una sesión (relación M:N):
 *      POST/DELETE  /sesiones/:sesionId/ponentes/:ponenteId
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SesionesController {
  constructor(private readonly sesiones: SesionesService) {}

  @Post('congresos/:congresoId/sesiones')
  @Roles('admin', 'organizador')
  crear(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: CrearSesionDto,
  ) {
    return this.sesiones.crear(orgId, congresoId, dto);
  }

  @Get('congresos/:congresoId/sesiones')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.sesiones.listar(orgId, congresoId);
  }

  @Patch('sesiones/:id')
  @Roles('admin', 'organizador')
  actualizar(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarSesionDto,
  ) {
    return this.sesiones.actualizar(orgId, id, dto);
  }

  @Delete('sesiones/:id')
  @Roles('admin', 'organizador')
  borrar(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sesiones.borrar(orgId, id);
  }

  @Post('sesiones/:sesionId/ponentes/:ponenteId')
  @Roles('admin', 'organizador')
  asignarPonente(
    @OrgId() orgId: string,
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Param('ponenteId', ParseUUIDPipe) ponenteId: string,
  ) {
    return this.sesiones.asignarPonente(orgId, sesionId, ponenteId);
  }

  @Delete('sesiones/:sesionId/ponentes/:ponenteId')
  @Roles('admin', 'organizador')
  quitarPonente(
    @OrgId() orgId: string,
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Param('ponenteId', ParseUUIDPipe) ponenteId: string,
  ) {
    return this.sesiones.quitarPonente(orgId, sesionId, ponenteId);
  }
}
