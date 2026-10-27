import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearPonenteDto } from './dto/crear-ponente.dto';
import { ActualizarPonenteDto } from './dto/actualizar-ponente.dto';
import { StorageService } from '../storage/storage.service';

/**
 * Lógica de los ponentes de un congreso. Mismo patrón: runInTenant + RLS.
 */
@Injectable()
export class PonentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

  /** Borrar un ponente del tenant (y sus vínculos con sesiones, y su foto). */
  async borrar(orgId: string, id: string) {
    const fotoVieja = await this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.ponente.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Ponente no encontrado');

      await tx.sesionPonente.deleteMany({ where: { ponente_id: id } });
      await tx.ponente.delete({ where: { id } });
      return existe.foto_url;
    });
    // La foto se borra DESPUÉS de la transacción: solo si el borrado en la
    // base salió bien (si fallara, el ponente seguiría y necesitaría su foto).
    await this.storage.borrarPorUrl(fotoVieja);
    return { borrado: true };
  }

  /**
   * Subir (o reemplazar) la foto de un ponente — Bloque 8.4.d.
   *
   * El orden está pensado para que nunca quede algo a medias:
   *  1. Se busca al ponente (con RLS: si es de otra organización, 404).
   *  2. Se sube la foto NUEVA a Storage. Va FUERA de la transacción a
   *     propósito: no queremos una conexión a la base esperando mientras viaja
   *     la imagen por internet.
   *  3. Se guarda la URL nueva. Si esto fallara, se borra la foto recién subida.
   *  4. Solo al final se borra la foto VIEJA.
   */
  async subirFoto(orgId: string, id: string, archivo: Express.Multer.File) {
    const ponente = await this.prisma.runInTenant(orgId, (tx) =>
      tx.ponente.findFirst({ where: { id } }),
    );
    if (!ponente) throw new NotFoundException('Ponente no encontrado');

    // Carpeta por cliente y congreso: <org>/<congreso>/ponentes/<id>-xxxx.webp
    const url = await this.storage.subirImagen(
      archivo,
      `${ponente.organizacion_id}/${ponente.congreso_id}/ponentes`,
      ponente.id,
    );

    let actualizado;
    try {
      actualizado = await this.prisma.runInTenant(orgId, (tx) =>
        tx.ponente.update({ where: { id }, data: { foto_url: url } }),
      );
    } catch (e) {
      await this.storage.borrarPorUrl(url);
      throw e;
    }
    await this.storage.borrarPorUrl(ponente.foto_url);
    return actualizado;
  }

  /** Quitar la foto de un ponente (vuelven las iniciales). */
  async quitarFoto(orgId: string, id: string) {
    const ponente = await this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.ponente.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Ponente no encontrado');
      await tx.ponente.update({ where: { id }, data: { foto_url: null } });
      return existe;
    });
    await this.storage.borrarPorUrl(ponente.foto_url);
    return { ...ponente, foto_url: null };
  }
}
