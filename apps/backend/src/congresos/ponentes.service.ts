import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearPonenteDto } from './dto/crear-ponente.dto';
import { ActualizarPonenteDto } from './dto/actualizar-ponente.dto';

/**
 * Lógica de los ponentes de un congreso. Mismo patrón: runInTenant + RLS.
 */
@Injectable()
export class PonentesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registrar un ponente en un congreso del tenant. */
  async crear(orgId: string, congresoId: string, dto: CrearPonenteDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      return tx.ponente.create({
        data: {
          organizacion_id: orgId,
          congreso_id: congresoId,
          nombre: dto.nombre,
          ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
          ...(dto.foto_url !== undefined ? { foto_url: dto.foto_url } : {}),
          ...(dto.cargo !== undefined ? { cargo: dto.cargo } : {}),
          ...(dto.empresa !== undefined ? { empresa: dto.empresa } : {}),
          ...(dto.pais !== undefined ? { pais: dto.pais } : {}),
          // null = "quitar el país". Por eso no basta con !== undefined: hay
          // que cuidar el toUpperCase() de un null.
          ...(dto.pais_codigo !== undefined
            ? { pais_codigo: dto.pais_codigo ? dto.pais_codigo.toUpperCase() : null }
            : {}),
          ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        },
      });
    });
  }

  /** Listar los ponentes de un congreso. */
  async listar(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      return tx.ponente.findMany({
        where: { congreso_id: congresoId },
        // Primero el orden que eligió el admin; los que no tienen, por nombre.
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        // Las charlas de cada ponente (Bloque 8.4): el panel muestra "dicta 2
        // charlas" y avisa antes de borrar a alguien que tiene charlas.
        include: {
          sesiones: {
            include: { sesion: { select: { id: true, titulo: true, inicio: true } } },
          },
        },
      });
    });
  }

  /** Actualizar un ponente del tenant. */
  async actualizar(orgId: string, id: string, dto: ActualizarPonenteDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.ponente.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Ponente no encontrado');

      return tx.ponente.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
          ...(dto.foto_url !== undefined ? { foto_url: dto.foto_url } : {}),
          ...(dto.cargo !== undefined ? { cargo: dto.cargo } : {}),
          ...(dto.empresa !== undefined ? { empresa: dto.empresa } : {}),
          ...(dto.pais !== undefined ? { pais: dto.pais } : {}),
          // null = "quitar el país". Por eso no basta con !== undefined: hay
          // que cuidar el toUpperCase() de un null.
          ...(dto.pais_codigo !== undefined
            ? { pais_codigo: dto.pais_codigo ? dto.pais_codigo.toUpperCase() : null }
            : {}),
          ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        },
      });
    });
  }

  /** Borrar un ponente del tenant (y sus vínculos con sesiones). */
  async borrar(orgId: string, id: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.ponente.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Ponente no encontrado');

      await tx.sesionPonente.deleteMany({ where: { ponente_id: id } });
      await tx.ponente.delete({ where: { id } });
      return { borrado: true };
    });
  }
}
