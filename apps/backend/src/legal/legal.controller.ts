import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { LegalService } from './legal.service';
import { AtenderSolicitudDto, DatosLegalesDto, RechazarSolicitudDto } from './dto/legal.dto';

/**
 * Lo legal del STAFF (8.7.c): organizador y superadmin (este último eligiendo
 * la organización con X-Organizacion-Id, como en el resto del panel).
 *   GET/PATCH  /organizacion/datos-legales
 *   GET        /solicitudes-datos
 *   POST       /solicitudes-datos/:id/suprimir   (atender = anonimizar)
 *   POST       /solicitudes-datos/:id/rechazar   (con explicación)
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'organizador')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Get('organizacion/datos-legales')
  ver(@OrgId() orgId: string) {
    return this.legal.verDatosLegales(orgId);
  }

  @Patch('organizacion/datos-legales')
  guardar(@OrgId() orgId: string, @Body() dto: DatosLegalesDto) {
    return this.legal.guardarDatosLegales(orgId, dto);
  }

  @Get('solicitudes-datos')
  listar(@OrgId() orgId: string) {
    return this.legal.listarSolicitudes(orgId);
  }

  @Post('solicitudes-datos/:id/suprimir')
  suprimir(
    @OrgId() orgId: string,
    @UserId() actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtenderSolicitudDto,
  ) {
    return this.legal.suprimir(orgId, actorId, id, dto.respuesta);
  }

  @Post('solicitudes-datos/:id/rechazar')
  rechazar(
    @OrgId() orgId: string,
    @UserId() actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RechazarSolicitudDto,
  ) {
    return this.legal.rechazar(orgId, actorId, id, dto.respuesta);
  }
}
