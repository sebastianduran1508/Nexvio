import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GuardarPersonalizacionDto } from './dto/personalizacion.dto';

/** Las dos imágenes de marca del congreso y la columna donde se guarda cada una. */
export type ImagenMarca = 'logo' | 'portada';
const COLUMNA: Record<ImagenMarca, 'logo_url' | 'imagen_portada_url'> = {
  logo: 'logo_url',
  portada: 'imagen_portada_url',
};

/** { logo_url: valor } o { imagen_portada_url: valor }, con tipos exactos para Prisma. */
function datosImagen(cual: ImagenMarca, valor: string | null) {
  return cual === 'logo' ? { logo_url: valor } : { imagen_portada_url: valor };
}

/** Lo que devolvemos cuando el congreso todavía no tiene personalización. */
const VACIA = {
  logo_url: null,
  imagen_portada_url: null,
  color_primario: null,
  color_secundario: null,
  tema_default: 'sistema',
};

/**
 * PERSONALIZACIÓN de un congreso (Bloque 8.5.c): logo, portada y colores.
 *
 * La tabla es 1:1 con el congreso (congreso_id es @unique). La fila NO se crea
 * con el congreso: nace la primera vez que el organizador guarda algo. Por eso:
 *  - leer devuelve valores vacíos si aún no existe (la app usa los de Nexvio);
 *  - guardar usa UPSERT: "actualiza si existe, créala si no", en una operación.
 */
@Injectable()
export class PersonalizacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async obtener(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      const p = await tx.personalizacionCongreso.findFirst({ where: { congreso_id: congresoId } });
      return p ?? { congreso_id: congresoId, ...VACIA };
    });
  }

  /** Guarda los colores. Solo toca lo que llega (undefined = no cambiar). */
  async guardar(orgId: string, congresoId: string, dto: GuardarPersonalizacionDto) {
    const cambios = {
      ...(dto.color_primario !== undefined ? { color_primario: dto.color_primario?.toUpperCase() ?? null } : {}),
      ...(dto.color_secundario !== undefined ? { color_secundario: dto.color_secundario?.toUpperCase() ?? null } : {}),
    };
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      return tx.personalizacionCongreso.upsert({
        where: { congreso_id: congresoId },
        update: cambios,
        // Al crear, organizacion_id sale del tenant (igual que en todo el proyecto):
        // así es imposible crear la fila "a nombre" de otra organización.
        create: { organizacion_id: orgId, congreso_id: congresoId, ...cambios },
      });
    });
  }

  /**
   * Sube el logo o la portada. Mismo orden seguro que la foto del ponente:
   * verificar el congreso, subir FUERA de la transacción, guardar la URL (si
   * falla, borrar lo subido) y al final borrar la imagen vieja.
   */
  async subirImagen(orgId: string, congresoId: string, cual: ImagenMarca, archivo: Express.Multer.File) {
    const columna = COLUMNA[cual];
    const actual = await this.obtener(orgId, congresoId); // también verifica el congreso (404)

    const url = await this.storage.subirImagen(archivo, `${orgId}/${congresoId}/marca`, cual);
    let guardada;
    try {
      guardada = await this.prisma.runInTenant(orgId, (tx) =>
        tx.personalizacionCongreso.upsert({
          where: { congreso_id: congresoId },
          update: datosImagen(cual, url),
          create: { organizacion_id: orgId, congreso_id: congresoId, ...datosImagen(cual, url) },
        }),
      );
    } catch (e) {
      await this.storage.borrarPorUrl(url);
      throw e;
    }
    await this.storage.borrarPorUrl(actual[columna]);
    return guardada;
  }

  /** Quita el logo o la portada (la app vuelve a la de Nexvio). */
  async quitarImagen(orgId: string, congresoId: string, cual: ImagenMarca) {
    const columna = COLUMNA[cual];
    const actual = await this.obtener(orgId, congresoId);
    if (!actual[columna]) return actual; // no había nada que quitar

    const guardada = await this.prisma.runInTenant(orgId, (tx) =>
      tx.personalizacionCongreso.update({
        where: { congreso_id: congresoId },
        data: datosImagen(cual, null),
      }),
    );
    await this.storage.borrarPorUrl(actual[columna]);
    return guardada;
  }
}
