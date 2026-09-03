import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/**
 * Networking (Fase 6): interes mutuo entre asistentes -> match -> conexion.
 *
 * El interes es DIRECCIONAL. Cuando A marca interes en B y ya existia el de B en
 * A, hay match: ambos intereses pasan a 'correspondido' y se crea una Conexion
 * (con limite de mensajes). El chat vive en el modulo/endpoints de la Fase 6.3.
 */
@Injectable()
export class NetworkingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Exige que el usuario este inscrito (confirmado) en el congreso. */
  private async exigirInscrito(tx: any, congresoId: string, usuarioId: string) {
    const insc = await tx.inscripcion.findFirst({
      where: { congreso_id: congresoId, usuario_id: usuarioId, estado: 'confirmada' },
    });
    if (!insc) throw new ForbiddenException('Debes estar inscrito en el congreso');
  }

  /**
   * Directorio de networking de un congreso: los demas asistentes inscritos y mi
   * relacion con cada uno:
   *   'ninguno'       -> aun no hay interes
   *   'enviado'       -> yo le envie interes (pendiente)
   *   'recibido'      -> el me envio interes (pendiente) y yo no
   *   'correspondido' -> hay match (trae conexionId para chatear)
   */
  async directorio(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      await this.exigirInscrito(tx, congresoId, usuarioId);

      const inscritos = await tx.inscripcion.findMany({
        where: {
          congreso_id: congresoId,
          estado: 'confirmada',
          usuario_id: { not: usuarioId },
        },
        include: { usuario: { select: { id: true, nombre: true } } },
      });

      const emitidos = await tx.interesNetworking.findMany({
        where: { congreso_id: congresoId, emisor_id: usuarioId },
      });
      const recibidos = await tx.interesNetworking.findMany({
        where: { congreso_id: congresoId, receptor_id: usuarioId },
      });
      const conexiones = await tx.conexion.findMany({
        where: {
          interes: {
            congreso_id: congresoId,
            OR: [{ emisor_id: usuarioId }, { receptor_id: usuarioId }],
          },
        },
        include: { interes: { select: { emisor_id: true, receptor_id: true } } },
      });

      const emit = new Map(emitidos.map((i: any) => [i.receptor_id, i.estado]));
      const recib = new Map(recibidos.map((i: any) => [i.emisor_id, i.estado]));
      const conex = new Map<string, string>();
      for (const c of conexiones) {
        const otro =
          c.interes.emisor_id === usuarioId ? c.interes.receptor_id : c.interes.emisor_id;
        conex.set(otro, c.id);
      }

      return inscritos.map((ins: any) => {
        const u = ins.usuario;
        let estado = 'ninguno';
        let conexionId: string | null = null;
        if (conex.has(u.id)) {
          estado = 'correspondido';
          conexionId = conex.get(u.id)!;
        } else if (emit.get(u.id) === 'pendiente') {
          estado = 'enviado';
        } else if (recib.get(u.id) === 'pendiente') {
          estado = 'recibido';
        }
        return { usuario: u, estado, conexionId };
      });
    });
  }

  /**
   * Marca interes del usuario en `receptorId`. Si ya existia el interes reciproco,
   * hay match: ambos pasan a 'correspondido' y se crea (o reutiliza) la conexion.
   */
  async expresarInteres(
    orgId: string,
    usuarioId: string,
    congresoId: string,
    receptorId: string,
  ) {
    if (usuarioId === receptorId) {
      throw new BadRequestException('No puedes conectar contigo mismo');
    }
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      await this.exigirInscrito(tx, congresoId, usuarioId);

      const receptorInsc = await tx.inscripcion.findFirst({
        where: { congreso_id: congresoId, usuario_id: receptorId, estado: 'confirmada' },
      });
      if (!receptorInsc) throw new NotFoundException('Ese asistente no esta en el congreso');

      // Mi interes (lo creo si no existe).
      let miInteres = await tx.interesNetworking.findFirst({
        where: { congreso_id: congresoId, emisor_id: usuarioId, receptor_id: receptorId },
      });
      if (!miInteres) {
        miInteres = await tx.interesNetworking.create({
          data: {
            organizacion_id: orgId,
            congreso_id: congresoId,
            emisor_id: usuarioId,
            receptor_id: receptorId,
          },
        });
      }

      // ¿Existe el interes reciproco (el otro ya me habia marcado)?
      const reciproco = await tx.interesNetworking.findFirst({
        where: { congreso_id: congresoId, emisor_id: receptorId, receptor_id: usuarioId },
      });

      if (reciproco) {
        // MATCH: ambos correspondido + conexion (si no hay ya una para el par).
        await tx.interesNetworking.updateMany({
          where: { id: { in: [miInteres.id, reciproco.id] } },
          data: { estado: 'correspondido' },
        });
        let conexion = await tx.conexion.findFirst({
          where: { interes_id: { in: [miInteres.id, reciproco.id] } },
        });
        if (!conexion) {
          conexion = await tx.conexion.create({
            data: { organizacion_id: orgId, interes_id: miInteres.id },
          });
        }
        return { match: true, conexionId: conexion.id };
      }

      return { match: false };
    });
  }

  /** Mis conexiones (matches), con la otra persona y el conteo/limite de mensajes. */
  async misConexiones(orgId: string, usuarioId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const conexiones = await tx.conexion.findMany({
        where: {
          OR: [
            { interes: { emisor_id: usuarioId } },
            { interes: { receptor_id: usuarioId } },
          ],
        },
        include: {
          interes: {
            include: {
              emisor: { select: { id: true, nombre: true } },
              receptor: { select: { id: true, nombre: true } },
            },
          },
          _count: { select: { mensajes: true } },
        },
        orderBy: { creado_en: 'desc' },
      });

      return conexiones.map((c: any) => {
        const otro =
          c.interes.emisor.id === usuarioId ? c.interes.receptor : c.interes.emisor;
        return {
          id: c.id,
          con: otro,
          limite_mensajes: c.limite_mensajes,
          mensajes: c._count.mensajes,
        };
      });
    });
  }
  /** Verifica que el usuario sea uno de los dos de la conexion; la devuelve. */
  private async conexionDelUsuario(tx: any, conexionId: string, usuarioId: string) {
    const conexion = await tx.conexion.findFirst({
      where: {
        id: conexionId,
        interes: { OR: [{ emisor_id: usuarioId }, { receptor_id: usuarioId }] },
      },
    });
    if (!conexion) throw new NotFoundException('Conexion no encontrada');
    return conexion;
  }

  /** Lista los mensajes de una conexion (solo sus dos integrantes). */
  async listarMensajes(orgId: string, usuarioId: string, conexionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const conexion = await this.conexionDelUsuario(tx, conexionId, usuarioId);
      const mensajes = await tx.mensajeChat.findMany({
        where: { conexion_id: conexionId },
        orderBy: { enviado_en: 'asc' },
        include: { autor: { select: { id: true, nombre: true } } },
      });
      return {
        limite_mensajes: conexion.limite_mensajes,
        usados: mensajes.length,
        mensajes,
      };
    });
  }

  /** Envia un mensaje respetando el limite de la conexion. */
  async enviarMensaje(
    orgId: string,
    usuarioId: string,
    conexionId: string,
    texto: string,
  ) {
    const mensaje = await this.prisma.runInTenant(orgId, async (tx) => {
      const conexion = await this.conexionDelUsuario(tx, conexionId, usuarioId);
      const usados = await tx.mensajeChat.count({ where: { conexion_id: conexionId } });
      if (usados >= conexion.limite_mensajes) {
        throw new BadRequestException('Se alcanzo el limite de mensajes de esta conexion');
      }
      return tx.mensajeChat.create({
        data: {
          organizacion_id: orgId,
          conexion_id: conexionId,
          autor_id: usuarioId,
          texto,
        },
        include: { autor: { select: { id: true, nombre: true } } },
      });
    });

    // Aviso en vivo a la sala de la conexion.
    this.realtime.mensajesCambiaron(conexionId);
    return mensaje;
  }
}