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
import { CongresosService } from './congresos.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { CrearCongresoDto } from './dto/crear-congreso.dto';
import { ActualizarCongresoDto } from './dto/actualizar-congreso.dto';

/**
 * Rutas de congresos (CRUD completo).
 *  - AuthGuard: exige token válido (si no, 401).
 *  - RolesGuard + @Roles: por endpoint, qué roles pueden usarlo (si no, 403).
 *
 * Convención de permisos:
 *  - LEER  -> todos los roles del tenant.
 *  - ESCRIBIR (crear/editar/borrar) -> solo admin y organizador.
 */
@Controller('congresos')
@UseGuards(AuthGuard, RolesGuard)
export class CongresosController {
  constructor(private readonly congresos: CongresosService) {}

  @Post()
  @Roles('admin', 'organizador')
  crear(@OrgId() orgId: string, @Body() dto: CrearCongresoDto) {
    return this.congresos.crear(orgId, dto);
  }

  @Get()
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(@OrgId() orgId: string) {
    return this.congresos.listar(orgId);
  }

  @Get(':id')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  obtener(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.congresos.obtener(orgId, id);
  }

  @Patch(':id')
  @Roles('admin', 'organizador')
  actualizar(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCongresoDto,
  ) {
    return this.congresos.actualizar(orgId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'organizador')
  borrar(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.congresos.borrar(orgId, id);
  }
}
