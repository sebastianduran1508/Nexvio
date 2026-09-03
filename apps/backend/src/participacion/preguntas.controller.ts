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
import { PreguntasService } from './preguntas.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { RolActual } from '../auth/rol.decorator';
import { CrearPreguntaDto } from './dto/crear-pregunta.dto';
import { ModerarPreguntaDto } from './dto/moderar-pregunta.dto';

/**
 * Rutas de preguntas en vivo (Fase 5):
 *   POST  /sesiones/:sesionId/preguntas   -> formular (cualquier rol del tenant)
 *   GET   /sesiones/:sesionId/preguntas   -> listar (vista segun rol)
 *   PATCH /preguntas/:id                  -> moderar (solo staff)
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class PreguntasController {
  constructor(private readonly preguntas: PreguntasService) {}

  @Post('sesiones/:sesionId/preguntas')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  crear(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Body() dto: CrearPreguntaDto,
  ) {
    return this.preguntas.crear(orgId, usuarioId, sesionId, dto);
  }

  @Get('sesiones/:sesionId/preguntas')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(
    @OrgId() orgId: string,
    @RolActual() rol: string,
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
  ) {
    return this.preguntas.listar(orgId, rol, sesionId);
  }

  @Patch('preguntas/:id')
  @Roles('admin', 'organizador', 'coordinador')
  moderar(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerarPreguntaDto,
  ) {
    return this.preguntas.moderar(orgId, id, dto.estado);
  }
}
