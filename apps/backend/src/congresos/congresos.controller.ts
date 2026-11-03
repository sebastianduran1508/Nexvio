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
import { UserId } from '../auth/user-id.decorator';
import { RolActual } from '../auth/rol.decorator';
import { CrearCongresoDto } from './dto/crear-congreso.dto';
import { ActualizarCongresoDto } from './dto/actualizar-congreso.dto';
import { AccesoCongresoGuard, SoloInscritos } from '../acceso/acceso-congreso.guard';

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
@UseGuards(AuthGuard, RolesGuard, AccesoCongresoGuard)
export class CongresosController {
  constructor(private readonly congresos: CongresosService) {}

  @Post()
  @Roles('admin', 'organizador')
  crear(@OrgId() orgId: string, @Body() dto: CrearCongresoDto) {
    return this.congresos.crear(orgId, dto);
  }

  @Get()
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(@OrgId() orgId: string, @RolActual() rol: string, @UserId() usuarioId: string) {
    // 8.7.b: el asistente solo recibe los congresos en los que está inscrito.
    return this.congresos.listar(orgId, rol === 'participante' ? usuarioId : undefined);
  }

  @Get(':id')
  @SoloInscritos('congreso', 'id')
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
