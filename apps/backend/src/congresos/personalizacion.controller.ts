import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
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
import { PersonalizacionService, type ImagenMarca } from './personalizacion.service';
import { GuardarPersonalizacionDto } from './dto/personalizacion.dto';

/** Las dos imágenes válidas en la ruta. ParseEnumPipe responde 400 con cualquier otra. */
const IMAGENES = { logo: 'logo', portada: 'portada' } as const;

/**
 * Rutas de la personalización de un congreso (Bloque 8.5.c):
 *   GET    /congresos/:congresoId/personalizacion          (todos: la app la lee)
 *   PUT    /congresos/:congresoId/personalizacion          (colores)
 *   POST   /congresos/:congresoId/personalizacion/logo     (multipart "archivo")
 *   POST   /congresos/:congresoId/personalizacion/portada
 *   DELETE /congresos/:congresoId/personalizacion/logo | /portada
 *
 * PUT y no PATCH: la personalización es UNA por congreso y "se guarda" (se crea
 * si no existía). Es la forma de decir "deja la personalización así".
 */
@Controller('congresos/:congresoId/personalizacion')
@UseGuards(AuthGuard, RolesGuard)
export class PersonalizacionController {
  constructor(private readonly personalizacion: PersonalizacionService) {}

  @Get()
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  obtener(@OrgId() orgId: string, @Param('congresoId', ParseUUIDPipe) congresoId: string) {
    return this.personalizacion.obtener(orgId, congresoId);
  }

  @Put()
  @Roles('admin', 'organizador')
  guardar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: GuardarPersonalizacionDto,
  ) {
    return this.personalizacion.guardar(orgId, congresoId, dto);
  }

  @Post(':cual')
  @Roles('admin', 'organizador')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_IMAGEN } }))
  subirImagen(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Param('cual', new ParseEnumPipe(IMAGENES)) cual: ImagenMarca,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.personalizacion.subirImagen(orgId, congresoId, cual, archivo);
  }

  @Delete(':cual')
  @Roles('admin', 'organizador')
  quitarImagen(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Param('cual', new ParseEnumPipe(IMAGENES)) cual: ImagenMarca,
  ) {
    return this.personalizacion.quitarImagen(orgId, congresoId, cual);
  }
}
