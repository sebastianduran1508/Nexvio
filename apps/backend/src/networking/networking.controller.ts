import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NetworkingService } from './networking.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { ExpresarInteresDto } from './dto/expresar-interes.dto';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';

const TODOS = ['admin', 'organizador', 'coordinador', 'participante'] as const;

/**
 * Rutas de networking (Fase 6):
 *   GET  /congresos/:congresoId/networking  -> directorio de asistentes + mi estado
 *   POST /congresos/:congresoId/intereses   -> marcar interes (detecta match)
 *   GET  /conexiones                        -> mis matches
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class NetworkingController {
  constructor(private readonly networking: NetworkingService) {}

  @Get('congresos/:congresoId/networking')
  @Roles(...TODOS)
  directorio(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.networking.directorio(orgId, usuarioId, congresoId);
  }

  @Post('congresos/:congresoId/intereses')
  @Roles(...TODOS)
  interes(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: ExpresarInteresDto,
  ) {
    return this.networking.expresarInteres(orgId, usuarioId, congresoId, dto.receptor_id);
  }

  @Get('conexiones')
  @Roles(...TODOS)
  misConexiones(@OrgId() orgId: string, @UserId() usuarioId: string) {
    return this.networking.misConexiones(orgId, usuarioId);
  }
  @Get('conexiones/:id/mensajes')
  @Roles(...TODOS)
  mensajes(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.networking.listarMensajes(orgId, usuarioId, id);
  }

  @Post('conexiones/:id/mensajes')
  @Roles(...TODOS)
  enviar(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnviarMensajeDto,
  ) {
    return this.networking.enviarMensaje(orgId, usuarioId, id, dto.texto);
  }
}