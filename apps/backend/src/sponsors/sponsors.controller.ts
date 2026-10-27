import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { LIMITE_IMAGEN } from '../storage/storage.service';
import { SponsorsService } from './sponsors.service';
import { ActualizarSponsorDto, CrearSponsorDto, OrdenarSponsorsDto } from './dto/sponsor.dto';

/**
 * Rutas de sponsors (Bloque 8.5.a). Mismo esquema que ponentes:
 *  - colgando del congreso:  POST/GET /congresos/:congresoId/sponsors
 *                            POST     /congresos/:congresoId/sponsors/orden
 *  - por su propio id:       PATCH/DELETE /sponsors/:id
 *  - el logo (multipart):    POST/DELETE  /sponsors/:id/logo
 *
 * Leer lo puede cualquiera del tenant (la app los muestra a los asistentes);
 * escribir, solo admin y organizador.
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Post('congresos/:congresoId/sponsors')
  @Roles('admin', 'organizador')
  crear(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: CrearSponsorDto,
  ) {
    return this.sponsors.crear(orgId, congresoId, dto);
  }

  @Get('congresos/:congresoId/sponsors')
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  listar(@OrgId() orgId: string, @Param('congresoId', ParseUUIDPipe) congresoId: string) {
    return this.sponsors.listar(orgId, congresoId);
  }

  @Post('congresos/:congresoId/sponsors/orden')
  @Roles('admin', 'organizador')
  ordenar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: OrdenarSponsorsDto,
  ) {
    return this.sponsors.ordenar(orgId, congresoId, dto.ids);
  }

  @Patch('sponsors/:id')
  @Roles('admin', 'organizador')
  actualizar(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarSponsorDto,
  ) {
    return this.sponsors.actualizar(orgId, id, dto);
  }

  @Delete('sponsors/:id')
  @Roles('admin', 'organizador')
  borrar(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sponsors.borrar(orgId, id);
  }

  @Post('sponsors/:id/logo')
  @Roles('admin', 'organizador')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_IMAGEN } }))
  subirLogo(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.sponsors.subirLogo(orgId, id, archivo);
  }

  @Delete('sponsors/:id/logo')
  @Roles('admin', 'organizador')
  quitarLogo(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sponsors.quitarLogo(orgId, id);
  }
}
