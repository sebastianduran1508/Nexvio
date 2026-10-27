import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ActualizarSponsorDto,
  CrearSponsorDto,
  NIVELES_SPONSOR,
} from './dto/sponsor.dto';

/** Posición del nivel en la lista (oro = 0 ... general = 3). */
const rangoNivel = (n: string) => {
  const i = (NIVELES_SPONSOR as readonly string[]).indexOf(n);
  return i === -1 ? NIVELES_SPONSOR.length : i;
};

/**
 * Ordena como se muestran: por nivel (Oro primero), luego por `orden`, luego
 * por nombre. El nivel no se puede ordenar en SQL tal cual (alfabéticamente
 * "bronce" iría antes que "oro"), así que se ordena aquí.
 */
export function ordenarSponsors<T extends { nivel: string; orden: number; nombre: string }>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      rangoNivel(a.nivel) - rangoNivel(b.nivel) ||
      a.orden - b.orden ||
      a.nombre.localeCompare(b.nombre),
  );
}

/**
 * "www.empresa.com" -> "https://www.empresa.com". Vacío -> null.
 * Si lo que queda no es una dirección web válida, 400.
 */
function normalizarSitio(valor: string | null | undefined): string | null | undefined {
  if (valor === undefined) return undefined; // no se mandó: no tocar
  const v = (valor ?? '').trim();
  if (!v) return null; // se mandó vacío: quitar el sitio
  const conProtocolo = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(conProtocolo);
    if (!url.hostname.includes('.')) throw new Error();
    return url.toString();
  } catch {
    throw new BadRequestException(`"${v}" no parece una dirección web válida`);
  }
}

/**
 * SPONSORS de un congreso (Bloque 8.5.a). Mismo patrón que ponentes:
 * runInTenant + RLS, y el logo en Supabase Storage (StorageService del 8.4).
 */
@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async crear(orgId: string, congresoId: string, dto: CrearSponsorDto) {
    const sitio = normalizarSitio(dto.sitio_web);
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      // Si no dicen el orden, va de último en su nivel.
      const nivel = dto.nivel ?? 'general';
      const orden =
        dto.orden ??
        (await tx.sponsor.count({ where: { congreso_id: congresoId, nivel } }));

      return tx.sponsor.create({
        data: {
          organizacion_id: orgId,
          congreso_id: congresoId,
          nombre: dto.nombre.trim(),
          sitio_web: sitio ?? null,
          nivel,
          orden,
        },
      });
    });
  }

  async listar(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      return ordenarSponsors(await tx.sponsor.findMany({ where: { congreso_id: congresoId } }));
    });
  }

  async actualizar(orgId: string, id: string, dto: ActualizarSponsorDto) {
    const sitio = normalizarSitio(dto.sitio_web);
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sponsor.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sponsor no encontrado');

      // Al cambiar de nivel, va de último en el nivel nuevo (si no dicen orden).
      let orden = dto.orden;
      if (dto.nivel && dto.nivel !== existe.nivel && orden === undefined) {
        orden = await tx.sponsor.count({ where: { congreso_id: existe.congreso_id, nivel: dto.nivel } });
      }

      return tx.sponsor.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(sitio !== undefined ? { sitio_web: sitio } : {}),
          ...(dto.nivel !== undefined ? { nivel: dto.nivel } : {}),
          ...(orden !== undefined ? { orden } : {}),
        },
      });
    });
  }

  /**
   * Reordenar: recibe los ids en el orden nuevo y les pone orden 0, 1, 2...
   * Todos deben ser de ESTE congreso (si alguno no, no se toca nada).
   */
  async ordenar(orgId: string, congresoId: string, ids: string[]) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const encontrados = await tx.sponsor.count({
        where: { congreso_id: congresoId, id: { in: ids } },
      });
      if (encontrados !== new Set(ids).size) {
        throw new BadRequestException('Algún sponsor no pertenece a este congreso');
      }
      for (const [orden, id] of ids.entries()) {
        await tx.sponsor.update({ where: { id }, data: { orden } });
      }
      return ordenarSponsors(await tx.sponsor.findMany({ where: { congreso_id: congresoId } }));
    });
  }

  async borrar(orgId: string, id: string) {
    const logo = await this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sponsor.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sponsor no encontrado');
      await tx.sponsor.delete({ where: { id } });
      return existe.logo_url;
    });
    await this.storage.borrarPorUrl(logo);
    return { borrado: true };
  }

  /**
   * Subir o reemplazar el logo. Mismo orden seguro que la foto del ponente
   * (8.4.d): buscar, subir fuera de la transacción, guardar la URL (si falla,
   * borrar lo subido) y al final borrar el logo viejo.
   */
  async subirLogo(orgId: string, id: string, archivo: Express.Multer.File) {
    const sponsor = await this.prisma.runInTenant(orgId, (tx) =>
      tx.sponsor.findFirst({ where: { id } }),
    );
    if (!sponsor) throw new NotFoundException('Sponsor no encontrado');

    const url = await this.storage.subirImagen(
      archivo,
      `${sponsor.organizacion_id}/${sponsor.congreso_id}/sponsors`,
      sponsor.id,
    );
    let actualizado;
    try {
      actualizado = await this.prisma.runInTenant(orgId, (tx) =>
        tx.sponsor.update({ where: { id }, data: { logo_url: url } }),
      );
    } catch (e) {
      await this.storage.borrarPorUrl(url);
      throw e;
    }
    await this.storage.borrarPorUrl(sponsor.logo_url);
    return actualizado;
  }

  async quitarLogo(orgId: string, id: string) {
    const sponsor = await this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sponsor.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sponsor no encontrado');
      await tx.sponsor.update({ where: { id }, data: { logo_url: null } });
      return existe;
    });
    await this.storage.borrarPorUrl(sponsor.logo_url);
    return { ...sponsor, logo_url: null };
  }
}
