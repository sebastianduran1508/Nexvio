import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CrearPreguntaDto } from './dto/crear-pregunta.dto';

const ROLES_STAFF = ['admin', 'organizador', 'coordinador'];

/**
 * Decisión 39 (8.10): ya no hay paso de "aprobar". Las preguntas que quedaron
 * 'aprobada' de antes se muestran como 'pendiente' (para el staff y para su
 * autor), así nadie ve un estado que ya no existe.
 */
function normalizar<T extends { estado: string }>(p: T): T {
  return p.estado === 'aprobada' ? { ...p, estado: 'pendiente' } : p;
}

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
      if (!sesion) throw new NotFoundException('Charla no encontrada');

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
    this.realtime.preguntasCambiaron(sesionId, usuarioId); // 9.13.b: solo al autor y al staff
    return pregunta;
  }

  /**
   * Lista las preguntas de una sesion. La vista depende del rol:
   *  - staff (admin/organizador/coordinador): TODAS (para poder responderlas).
   *  - asistente (participante): SOLO LAS SUYAS, en cualquier estado
   *    (decisión 39, 8.10: las preguntas son privadas; antes era un "muro
   *    público" con las aprobadas de todos).
   *
   * Ejemplo: Ana y Beto preguntan en la misma charla. Ana ve solo la suya
   * ("Pendiente" y luego "Respondida"); Beto solo la de él; el coordinador,
   * las dos.
   */
  async listar(orgId: string, rol: string, usuarioId: string, sesionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Charla no encontrada');

      const esStaff = ROLES_STAFF.includes(rol);
      const lista = await tx.pregunta.findMany({
        where: {
          sesion_id: sesionId,
          ...(esStaff ? {} : { usuario_id: usuarioId }),
        },
        orderBy: { creado_en: 'asc' },
        // 8.7.h: el staff ve nombre completo y foto (para moderar con contexto);
        // el asistente solo el nombre de pila (minimización, Ley 1581).
        include: {
          usuario: {
            select: esStaff
              ? { nombre: true, apellidos: true, foto_url: true }
              : { nombre: true },
          },
        },
      });
      return lista.map(normalizar);
    });
  }

  /**
   * El staff cambia el estado de una pregunta: marcarla respondida,
   * descartarla ('rechazada': spam o repetida) o devolverla a pendiente.
   */
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

    this.realtime.preguntasCambiaron(pregunta.sesion_id, pregunta.usuario_id); // 9.13.b
    return normalizar(pregunta);
  }
}
