import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EncuestasService } from './encuestas.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { RolActual } from '../auth/rol.decorator';
import { CrearEncuestaDto } from './dto/crear-encuesta.dto';
import { ActualizarEncuestaDto } from './dto/actualizar-encuesta.dto';
import { VotarDto } from './dto/votar.dto';

/**
 * Rutas de encuestas en vivo (Fase 5):
 *   POST  /sesiones/:sesionId/encuestas  -> crear (staff)
 *   GET   /sesiones/:sesionId/encuestas  -> listar (staff todas; asistente activas)
 *   PATCH /encuestas/:id                 -> abrir/cerrar (staff)
 *   POST  /encuestas/:id/votar           -> votar (cualquiera del tenant)
 *   GET   /encuestas/:id/resultados      -> resultados actuales (cualquiera)
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class EncuestasController {
  constructor(private readonly encuestas: EncuestasService) {}

  @Post('sesiones/:sesionId/encuestas')
  @Roles('admin', 'organizador', 'coordinador')
  crear(
    @OrgId() orgId: string,
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Body() dto: CrearEncuestaDto,
  ) {
    return this.encuestas.crear(orgId, sesionId, dto);
  }

  @Get('sesiones/:sesionId/encuestas')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(
    @OrgId() orgId: string,
    @RolActual() rol: string,
    @UserId() usuarioId: string,
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
  ) {
    return this.encuestas.listar(orgId, rol, sesionId, usuarioId);
  }

  @Patch('encuestas/:id')
  @Roles('admin', 'organizador', 'coordinador')
  cambiarEstado(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEncuestaDto,
  ) {
    return this.encuestas.cambiarEstado(orgId, id, dto.activa);
  }

  @Post('encuestas/:id/votar')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  votar(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VotarDto,
  ) {
    return this.encuestas.votar(orgId, usuarioId, id, dto.opcion_id);
  }

  @Get('encuestas/:id/resultados')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  resultados(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.encuestas.resultados(orgId, id, usuarioId);
  }
}
