import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AyudaService } from './ayuda.service';
import { ActualizarArticuloDto, CrearArticuloDto, OrdenarArticulosDto } from './dto/ayuda.dto';

/**
 * Rutas de la Ayuda (Bloque 8.6.d). Fíjate que NO usan @OrgId(): la ayuda no
 * pertenece a ninguna organización (el superadmin puede editarla sin haber
 * elegido una).
 *   GET    /ayuda            leer (staff del panel)
 *   POST   /ayuda            crear      (solo superadmin)
 *   PATCH  /ayuda/:id        editar     (solo superadmin)
 *   DELETE /ayuda/:id        borrar     (solo superadmin)
 *   POST   /ayuda/orden      reordenar  (solo superadmin)
 */
@Controller('ayuda')
@UseGuards(AuthGuard, RolesGuard)
export class AyudaController {
  constructor(private readonly ayuda: AyudaService) {}

  @Get()
  @Roles('admin', 'organizador', 'coordinador')
  listar(@Req() req: { user?: { rol?: string } }) {
    return this.ayuda.listar(req.user?.rol === 'admin');
  }

  @Post()
  @Roles('admin')
  crear(@Body() dto: CrearArticuloDto) {
    return this.ayuda.crear(dto);
  }

  @Post('orden')
  @Roles('admin')
  ordenar(@Body() dto: OrdenarArticulosDto) {
    return this.ayuda.ordenar(dto.ids);
  }

  @Patch(':id')
  @Roles('admin')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarArticuloDto) {
    return this.ayuda.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  borrar(@Param('id', ParseUUIDPipe) id: string) {
    return this.ayuda.borrar(id);
  }
}
