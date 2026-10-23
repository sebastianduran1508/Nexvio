import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { AsistentesService } from './asistentes.service';
import { ImportacionService } from './importacion.service';
import { CrearAsistenteDto, ActualizarAsistenteDto } from './dto/asistente.dto';

/** Tope del archivo subido: 5 MB es muchísimo para un Excel de inscritos. */
const LIMITE_ARCHIVO = 5 * 1024 * 1024;

/**
 * Gestión de los asistentes de un congreso (Bloque 8.3).
 *
 * Todo cuelga de /congresos/:congresoId porque la unidad de trabajo del admin
 * es el congreso, no la organización: el tipo de suscripción, la inscripción y
 * la importación son por evento.
 *
 * El superadmin usa estas mismas rutas; solo tiene que mandar la cabecera
 * X-Organizacion-Id (suplantación de tenant del Bloque 8.2).
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class AsistentesController {
  constructor(
    private readonly asistentes: AsistentesService,
    private readonly importacion: ImportacionService,
  ) {}

  // ------------------------------------------------------------------ CRUD

  @Get('congresos/:congresoId/asistentes')
  @Roles('admin', 'organizador', 'coordinador')
  listar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.asistentes.listar(orgId, congresoId);
  }

  @Post('congresos/:congresoId/asistentes')
  @Roles('admin', 'organizador')
  crear(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @Body() dto: CrearAsistenteDto,
  ) {
    return this.asistentes.crear(orgId, congresoId, dto);
  }

  /** La ficha completa de una persona (el panel de detalle). */
  @Get('asistentes/:usuarioId')
  @Roles('admin', 'organizador', 'coordinador')
  obtener(
    @OrgId() orgId: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
  ) {
    return this.asistentes.obtener(orgId, usuarioId);
  }

  /**
   * Restablecer la contraseña de un asistente (perdió su acceso).
   *
   * No existe un "ver contraseña": Supabase guarda solo el hash y la original
   * no se puede leer. Lo único posible es generar otra, y eso es esto.
   */
  @Post('asistentes/:usuarioId/restablecer-password')
  @Roles('admin', 'organizador')
  restablecer(
    @OrgId() orgId: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
  ) {
    return this.asistentes.restablecerPassword(orgId, usuarioId);
  }

  @Patch('asistentes/:usuarioId')
  @Roles('admin', 'organizador')
  actualizar(
    @OrgId() orgId: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Body() dto: ActualizarAsistenteDto,
  ) {
    return this.asistentes.actualizar(orgId, usuarioId, dto);
  }

  @Patch('inscripciones/:inscripcionId/suscripcion')
  @Roles('admin', 'organizador')
  suscripcion(
    @OrgId() orgId: string,
    @Param('inscripcionId', ParseUUIDPipe) inscripcionId: string,
    @Body() body: { tipo_suscripcion?: string | null },
  ) {
    return this.asistentes.actualizarSuscripcion(
      orgId,
      inscripcionId,
      body.tipo_suscripcion ?? null,
    );
  }

  @Delete('inscripciones/:inscripcionId/asistente')
  @Roles('admin', 'organizador')
  quitar(
    @OrgId() orgId: string,
    @Param('inscripcionId', ParseUUIDPipe) inscripcionId: string,
  ) {
    return this.asistentes.quitarDelCongreso(orgId, inscripcionId);
  }

  // ----------------------------------------------------------- importación

  /** La plantilla vacía que la organización llena y devuelve. */
  @Get('congresos/:congresoId/importacion/plantilla')
  @Roles('admin', 'organizador')
  async plantilla(@Res() res: Response) {
    const buffer = await this.importacion.excelPlantilla();
    this.enviarExcel(res, 'plantilla-inscritos-nexvio.xlsx', buffer);
  }

  /**
   * El listado de acceso completo del congreso: TODOS los inscritos con su
   * usuario, y contraseña nueva solo para quienes aún no han estrenado la
   * cuenta. A quien ya entró y puso la suya no se le toca nada.
   */
  @Post('congresos/:congresoId/listado-acceso')
  @Roles('admin', 'organizador')
  listadoAcceso(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
  ) {
    return this.asistentes.listadoDeAcceso(orgId, congresoId);
  }

  /** PASO 1: analiza el archivo y dice qué pasaría. No escribe nada. */
  @Post('congresos/:congresoId/importacion/previsualizar')
  @Roles('admin', 'organizador')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_ARCHIVO } }))
  previsualizar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) throw new BadRequestException('No llegó ningún archivo');
    return this.importacion.analizar(orgId, congresoId, archivo.buffer);
  }

  /** PASO 2: ejecuta la importación y devuelve las credenciales generadas. */
  @Post('congresos/:congresoId/importacion/confirmar')
  @Roles('admin', 'organizador')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: LIMITE_ARCHIVO } }))
  confirmar(
    @OrgId() orgId: string,
    @Param('congresoId', ParseUUIDPipe) congresoId: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) throw new BadRequestException('No llegó ningún archivo');
    return this.importacion.importar(orgId, congresoId, archivo.buffer);
  }

  /**
   * Convierte en Excel la lista de credenciales que devolvió la importación.
   *
   * El panel manda de vuelta lo que recibió en el paso anterior. Las
   * contraseñas NO se guardan en ningún lado (en la base solo queda su hash,
   * dentro de Supabase), así que este archivo es la única copia: por eso la
   * descarga es inmediata y el panel avisa de ello.
   */
  @Post('congresos/:congresoId/importacion/credenciales.xlsx')
  @Roles('admin', 'organizador')
  async credenciales(
    @Body() body: { congreso: string; credenciales: any[] },
    @Res() res: Response,
  ) {
    const buffer = await this.importacion.excelCredenciales(
      body.congreso ?? 'Congreso',
      body.credenciales ?? [],
    );
    this.enviarExcel(res, 'credenciales-nexvio.xlsx', buffer);
  }

  private enviarExcel(res: Response, nombre: string, buffer: Buffer) {
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.end(buffer);
  }
}
