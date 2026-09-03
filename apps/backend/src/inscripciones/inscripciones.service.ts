import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Logica del Modulo Inscripciones (Fase 4). Enlaza a un asistente (usuario)
 * con un congreso dentro de un tenant. Mismo principio que el resto: todo
 * corre dentro de runInTenant(orgId, ...) y el RLS filtra por organizacion.
 *
 * La identidad de QUIEN se inscribe llega SIEMPRE del token (usuarioId = sub),
 * nunca del cuerpo: asi es imposible inscribir a otra persona falsificando el
 * body.
 */
@Injectable()
export class InscripcionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El asistente autenticado se inscribe a un congreso del tenant.
   * - Si el congreso no existe (o es de otra org, invisible por RLS) -> 404.
   * - Si ya tiene una inscripcion confirmada -> 409.
   * - Si tenia una inscripcion cancelada -> la reactiva (vuelve a 'confirmada').
   * - Si no habia nada -> crea la inscripcion.
   */
  async inscribir(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      // ¿Ya existe una inscripcion de este usuario a este congreso?
      // El @@unique(congreso_id, usuario_id) garantiza que hay 0 o 1.
      const existente = await tx.inscripcion.findFirst({
        where: { congreso_id: congresoId, usuario_id: usuarioId },
      });

      if (existente) {
        if (existente.estado === 'confirmada') {
          throw new ConflictException('Ya estas inscrito en este congreso');
        }
        // Estaba cancelada: la reactivamos en vez de crear una fila nueva
        // (respeta la restriccion de unicidad y conserva el historial).
        return tx.inscripcion.update({
          where: { id: existente.id },
          data: { estado: 'confirmada', registrado_en: new Date() },
        });
      }

      return tx.inscripcion.create({
        data: {
          organizacion_id: orgId, // lo exige el RLS (WITH CHECK)
          congreso_id: congresoId,
          usuario_id: usuarioId,
          estado: 'confirmada',
        },
      });
    });
  }

  /** Las inscripciones ACTIVAS del asistente autenticado, con datos del congreso. */
  async mias(orgId: string, usuarioId: string) {
    return this.prisma.runInTenant(orgId, async (tx) =>
      tx.inscripcion.findMany({
        where: { usuario_id: usuarioId, estado: 'confirmada' },
        orderBy: { registrado_en: 'desc' },
        include: {
          congreso: {
            select: {
              id: true,
              nombre: true,
              fecha_inicio: true,
              fecha_fin: true,
              estado: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Cancela (soft) una inscripcion: la deja en estado 'cancelada' en vez de
   * borrarla, para conservar el historial. Solo se puede cancelar la PROPIA:
   * si el id es de otro usuario, se responde 404 (ni siquiera confirmamos que
   * existe).
   */
  async cancelar(orgId: string, usuarioId: string, inscripcionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const insc = await tx.inscripcion.findFirst({ where: { id: inscripcionId } });
      if (!insc || insc.usuario_id !== usuarioId) {
        throw new NotFoundException('Inscripcion no encontrada');
      }
      await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: { estado: 'cancelada' },
      });
      return { cancelada: true };
    });
  }

  /**
   * Lista de inscritos (confirmados) de un congreso, para el staff. Incluye
   * nombre y email del usuario. La tabla usuario tambien tiene RLS, asi que
   * solo se ven usuarios del mismo tenant.
   */
  async listarDeCongreso(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      return tx.inscripcion.findMany({
        where: { congreso_id: congresoId, estado: 'confirmada' },
        orderBy: { registrado_en: 'asc' },
        include: {
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      });
    });
  }
}
