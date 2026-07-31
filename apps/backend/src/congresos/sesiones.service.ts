import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';

/**
 * Lógica de la agenda: las sesiones de un congreso y qué ponentes exponen en cada una.
 * Mismo principio que congresos: todo dentro de runInTenant, RLS filtrando.
 */
@Injectable()
export class SesionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crear una sesión dentro de un congreso del tenant. */
  async crear(orgId: string, congresoId: string, dto: CrearSesionDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      // Verificamos que el congreso exista y sea del tenant (RLS lo filtra).
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      return tx.sesion.create({
        data: {
          organizacion_id: orgId,
          congreso_id: congresoId,
          titulo: dto.titulo,
          inicio: new Date(dto.inicio),
          fin: new Date(dto.fin),
          ...(dto.sala !== undefined ? { sala: dto.sala } : {}),
        },
      });
    });
  }

  /** Listar las sesiones de un congreso, con sus ponentes. */
  async listar(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      return tx.sesion.findMany({
        where: { congreso_id: congresoId },
        orderBy: { inicio: 'asc' },
        include: { ponentes: { include: { ponente: true } } },
      });
    });
  }

  /** Actualizar una sesión del tenant. */
  async actualizar(orgId: string, id: string, dto: ActualizarSesionDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sesion.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sesión no encontrada');

      return tx.sesion.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
          ...(dto.inicio !== undefined ? { inicio: new Date(dto.inicio) } : {}),
          ...(dto.fin !== undefined ? { fin: new Date(dto.fin) } : {}),
          ...(dto.sala !== undefined ? { sala: dto.sala } : {}),
        },
      });
    });
  }

  /** Borrar una sesión del tenant (y sus vínculos con ponentes). */
  async borrar(orgId: string, id: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sesion.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sesión no encontrada');

      await tx.sesionPonente.deleteMany({ where: { sesion_id: id } });
      await tx.sesion.delete({ where: { id } });
      return { borrado: true };
    });
  }

  /**
   * Asignar un ponente a una sesión (crea la fila en la tabla intermedia).
   * Ambos (sesión y ponente) deben ser del tenant; el RLS los hace invisibles
   * si son de otra organización -> 404.
   */
  async asignarPonente(orgId: string, sesionId: string, ponenteId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Sesión no encontrada');

      const ponente = await tx.ponente.findFirst({ where: { id: ponenteId } });
      if (!ponente) throw new NotFoundException('Ponente no encontrado');

      // ¿Ya estaba asignado? El @@unique(sesion_id, ponente_id) también lo evita
      // a nivel BD, pero damos un mensaje claro (409) en vez de un error feo.
      const ya = await tx.sesionPonente.findFirst({
        where: { sesion_id: sesionId, ponente_id: ponenteId },
      });
      if (ya) throw new ConflictException('El ponente ya está asignado a esta sesión');

      return tx.sesionPonente.create({
        data: {
          organizacion_id: orgId,
          sesion_id: sesionId,
          ponente_id: ponenteId,
        },
      });
    });
  }

  /** Quitar un ponente de una sesión (borra la fila de la tabla intermedia). */
  async quitarPonente(orgId: string, sesionId: string, ponenteId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const vinculo = await tx.sesionPonente.findFirst({
        where: { sesion_id: sesionId, ponente_id: ponenteId },
      });
      if (!vinculo) throw new NotFoundException('El ponente no está asignado a esa sesión');

      await tx.sesionPonente.delete({ where: { id: vinculo.id } });
      return { borrado: true };
    });
  }
}
