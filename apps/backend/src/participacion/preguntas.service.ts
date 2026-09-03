import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CrearPreguntaDto } from './dto/crear-pregunta.dto';

const ROLES_STAFF = ['admin', 'organizador', 'coordinador'];

/**
 * Preguntas en vivo (Fase 5). El asistente formula preguntas en una sesion y el
 * coordinador las modera. Todo bajo runInTenant -> el RLS filtra por organizacion.
 *
 * Tras cada escritura, avisamos a la sala de la sesion por Socket.io (patron
 * "avisar y refrescar"): las pantallas oyen el aviso y vuelven a pedir la lista.
 */
@Injectable()
export class PreguntasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Un usuario formula una pregunta en una sesion del tenant (queda 'pendiente'). */
  async crear(orgId: string, usuarioId: string, sesionId: string, dto: CrearPreguntaDto) {
    const pregunta = await this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Sesion no encontrada');

      return tx.pregunta.create({
        data: {
          organizacion_id: orgId,
          sesion_id: sesionId,
          usuario_id: usuarioId,
          texto: dto.texto,
        },
        include: { usuario: { select: { nombre: true } } },
      });
    });

    // Aviso en vivo (fuera de la transaccion: ya esta confirmada).
    this.realtime.preguntasCambiaron(sesionId);
    return pregunta;
  }

  /**
   * Lista las preguntas de una sesion. La vista depende del rol:
   *  - staff (admin/organizador/coordinador): TODAS (para poder moderar).
   *  - asistente (participante): solo las 'aprobada' y 'respondida' (el muro publico).
   */
  async listar(orgId: string, rol: string, sesionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Sesion no encontrada');

      const esStaff = ROLES_STAFF.includes(rol);
      return tx.pregunta.findMany({
        where: {
          sesion_id: sesionId,
          ...(esStaff ? {} : { estado: { in: ['aprobada', 'respondida'] } }),
        },
        orderBy: { creado_en: 'asc' },
        include: { usuario: { select: { nombre: true } } },
      });
    });
  }

  /** El staff cambia el estado de una pregunta (aprobar/rechazar/marcar respondida). */
  async moderar(orgId: string, id: string, estado: string) {
    const pregunta = await this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.pregunta.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Pregunta no encontrada');

      return tx.pregunta.update({
        where: { id },
        data: { estado },
        include: { usuario: { select: { nombre: true } } },
      });
    });

    this.realtime.preguntasCambiaron(pregunta.sesion_id);
    return pregunta;
  }
}
