import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarArticuloDto, CrearArticuloDto } from './dto/ayuda.dto';

/**
 * AYUDA DEL PANEL (Bloque 8.6.d): artículos en Markdown que el superadmin
 * escribe y los organizadores leen.
 *
 * Usa runInTenant como todo el proyecto, aunque la tabla no tenga
 * organizacion_id: lo que importa aquí es que fija `app.rol`, y la política
 * de escritura de articulo_ayuda solo deja escribir al rol 'admin'.
 */
@Injectable()
export class AyudaService {
  constructor(private readonly prisma: PrismaService) {}

  /** El superadmin ve también los borradores; los demás, solo lo publicado. */
  listar(esAdmin: boolean) {
    return this.prisma.runInTenant(undefined, (tx) =>
      tx.articuloAyuda.findMany({
        where: esAdmin ? {} : { publicado: true },
        orderBy: [{ orden: 'asc' }, { creado_en: 'asc' }],
      }),
    );
  }

  crear(dto: CrearArticuloDto) {
    return this.prisma.runInTenant(undefined, async (tx) => {
      // Va de último.
      const orden = await tx.articuloAyuda.count();
      return tx.articuloAyuda.create({
        data: {
          titulo: dto.titulo.trim(),
          contenido: dto.contenido,
          publicado: dto.publicado ?? true,
          orden,
        },
      });
    });
  }

  actualizar(id: string, dto: ActualizarArticuloDto) {
    return this.prisma.runInTenant(undefined, async (tx) => {
      const existe = await tx.articuloAyuda.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Artículo no encontrado');
      return tx.articuloAyuda.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
          ...(dto.contenido !== undefined ? { contenido: dto.contenido } : {}),
          ...(dto.publicado !== undefined ? { publicado: dto.publicado } : {}),
        },
      });
    });
  }

  borrar(id: string) {
    return this.prisma.runInTenant(undefined, async (tx) => {
      const existe = await tx.articuloAyuda.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Artículo no encontrado');
      await tx.articuloAyuda.delete({ where: { id } });
      return { borrado: true };
    });
  }

  ordenar(ids: string[]) {
    return this.prisma.runInTenant(undefined, async (tx) => {
      const n = await tx.articuloAyuda.count({ where: { id: { in: ids } } });
      if (n !== new Set(ids).size) throw new BadRequestException('Algún artículo no existe');
      for (const [orden, id] of ids.entries()) {
        await tx.articuloAyuda.update({ where: { id }, data: { orden } });
      }
      return tx.articuloAyuda.findMany({ orderBy: [{ orden: 'asc' }, { creado_en: 'asc' }] });
    });
  }
}
