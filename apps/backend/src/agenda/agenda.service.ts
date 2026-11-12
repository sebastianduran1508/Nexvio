import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MI AGENDA (Bloque 8.7.e): las charlas que cada persona marca con ⭐.
 *
 * Todo opera sobre el `usuarioId` del token: cada quien marca y ve solo lo
 * suyo. El AccesoCongresoGuard (8.7.b) ya garantiza en el controlador que solo
 * se puedan marcar charlas del congreso en el que la persona está inscrita.
 */
@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los ids de mis charlas marcadas en un congreso. */
  async miAgenda(orgId: string, usuarioId: string, congresoId: string) {
    const filas = await this.prisma.runInTenant(orgId, (tx) =>
      tx.sesionFavorita.findMany({
        where: { usuario_id: usuarioId, sesion: { congreso_id: congresoId } },
        select: { sesion_id: true },
      }),
    );
    return { sesion_ids: filas.map((f) => f.sesion_id) };
  }

  /** Marcar ⭐ (si ya estaba marcada, no pasa nada: es idempotente). */
  async marcar(orgId: string, usuarioId: string, sesionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId }, select: { tipo: true } });
      if (!sesion) throw new NotFoundException('Charla no encontrada');
      // Un break (café, almuerzo) no es una charla: no se "agenda".
      if (sesion.tipo === 'break') throw new BadRequestException('Los breaks no se pueden marcar');
      await tx.sesionFavorita.upsert({
        where: { usuario_id_sesion_id: { usuario_id: usuarioId, sesion_id: sesionId } },
        create: { organizacion_id: orgId, usuario_id: usuarioId, sesion_id: sesionId },
        update: {},
      });
      return { marcada: true };
    });
  }

  /** Quitar ⭐. */
  async desmarcar(orgId: string, usuarioId: string, sesionId: string) {
    await this.prisma.runInTenant(orgId, (tx) =>
      tx.sesionFavorita.deleteMany({ where: { usuario_id: usuarioId, sesion_id: sesionId } }),
    );
    return { marcada: false };
  }
}
