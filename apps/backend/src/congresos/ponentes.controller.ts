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
import { PonentesService } from './ponentes.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { CrearPonenteDto } from './dto/crear-ponente.dto';
import { ActualizarPonenteDto } from './dto/actualizar-ponente.dto';

/**
 * Rutas de ponentes.
 *  - Se REGISTRAN y LISTAN colgando de un congreso:
 *      POST/GET  /congresos/:congresoId/ponentes
 *  - Se EDITAN/BORRAN por su propio id:
 *      PATCH/DELETE  /ponentes/:id
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class PonentesController {
  constructor(private readonly ponentes: PonentesService) {}

  @Post('congresos/:congresoId/ponentes')
  @Roles('admin', 'organizador')
  crear(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: CrearPonenteDto,
  ) {
    return this.ponentes.crear(orgId, congresoId, dto);
  }

  @Get('congresos/:congresoId/ponentes')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.ponentes.listar(orgId, congresoId);
  }

  @Patch('ponentes/:id')
  @Roles('admin', 'organizador')
  actualizar(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarPonenteDto,
  ) {
    return this.ponentes.actualizar(orgId, id, dto);
  }

  @Delete('ponentes/:id')
  @Roles('admin', 'organizador')
  borrar(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ponentes.borrar(orgId, id);
  }
}
