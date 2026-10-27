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
import { LIMITE_IMAGEN } from '../storage/storage.service';
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
 *  - Su FOTO (8.4.d), como archivo multipart en el campo "archivo":
 *      POST/DELETE   /ponentes/:id/foto
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

  @Post('ponentes/:id/foto')
  @Roles('admin', 'organizador')
  // Multer corta en 2 MB: un archivo más grande ni siquiera llega a memoria.
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_IMAGEN } }))
  subirFoto(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.ponentes.subirFoto(orgId, id, archivo);
  }

  @Delete('ponentes/:id/foto')
  @Roles('admin', 'organizador')
  quitarFoto(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ponentes.quitarFoto(orgId, id);
  }

  @Delete('ponentes/:id')
  @Roles('admin', 'organizador')
  borrar(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ponentes.borrar(orgId, id);
  }
}
