import {
  Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { UserId } from '../auth/user-id.decorator';
import { LIMITE_IMAGEN } from '../storage/storage.service';
import { PerfilService } from './perfil.service';
import { ActualizarPerfilDto, CrearSolicitudDto } from './dto/perfil.dto';

/**
 * Rutas del PROPIO perfil (8.7.c). No llevan ningún id en la URL a propósito:
 * siempre es "el mío" (el del token), así no hay id ajeno que probar.
 *   GET/PATCH        /perfil
 *   POST/DELETE      /perfil/foto
 *   GET/POST         /perfil/solicitudes   (pedir supresión de datos)
 * (El superadmin global no tiene perfil de organización: no aplica.)
 */
@Controller('perfil')
@UseGuards(AuthGuard, RolesGuard)
@Roles('organizador', 'coordinador', 'participante')
export class PerfilController {
  constructor(private readonly perfil: PerfilService) {}

  @Get()
  ver(@OrgId() orgId: string, @UserId() usuarioId: string) {
    return this.perfil.ver(orgId, usuarioId);
  }

  @Patch()
  actualizar(@OrgId() orgId: string, @UserId() usuarioId: string, @Body() dto: ActualizarPerfilDto) {
    return this.perfil.actualizar(orgId, usuarioId, dto);
  }

  @Post('foto')
  // Multer corta en 2 MB: un archivo más grande ni siquiera llega a memoria.
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_IMAGEN } }))
  subirFoto(
    @OrgId() orgId: string,
    @UserId() usuarioId: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.perfil.subirFoto(orgId, usuarioId, archivo);
  }

  @Delete('foto')
  quitarFoto(@OrgId() orgId: string, @UserId() usuarioId: string) {
    return this.perfil.quitarFoto(orgId, usuarioId);
  }

  @Get('solicitudes')
  misSolicitudes(@OrgId() orgId: string, @UserId() usuarioId: string) {
    return this.perfil.misSolicitudes(orgId, usuarioId);
  }

  @Post('solicitudes')
  pedirSupresion(@OrgId() orgId: string, @UserId() usuarioId: string, @Body() dto: CrearSolicitudDto) {
    return this.perfil.pedirSupresion(orgId, usuarioId, dto.motivo);
  }
}
