import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { aInstante } from '../congresos/zona-horaria.util';
import { ExpoPushService } from './expo-push.service';
import { CrearNotificacionDto, RegistrarDispositivoDto } from './dto/notificacion.dto';

/** Un aviso programado debe quedar al menos 1 minuto en el futuro… */
const MINIMO_MS = 60 * 1000;
/** …y como mucho a un año. */
const MAXIMO_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * NOTIFICACIONES de un congreso (Bloque 8.6).
 *
 * Cada aviso se guarda SIEMPRE en la tabla `notificacion`, aunque nadie tenga
 * la app compilada: así la bandeja "Avisos" de la app lo muestra igual, y el
 * panel tiene el historial con cuántos teléfonos lo recibieron.
 *
 * Estados: programada -> enviando -> enviada | fallida.
 */
@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: ExpoPushService,
  ) {}

  /** Crear un aviso: se envía ya, o queda programado. */
  async crear(orgId: string, usuarioId: string, congresoId: string, dto: CrearNotificacionDto) {
    const notificacion = await this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      const destino = dto.destino ?? 'todos';
      const conSesion = destino === 'sesion' || destino === 'favoritos';
      if (conSesion) {
        if (!dto.sesion_id) throw new BadRequestException('Elige la sesión del aviso');
        const sesion = await tx.sesion.findFirst({ where: { id: dto.sesion_id, congreso_id: congresoId } });
        if (!sesion) throw new BadRequestException('La sesión no es de este congreso');
      }

      // ¿Programado? Mismo acuerdo que la agenda: la hora es la del evento.
      let programada: Date | null = null;
      if (dto.programada_para) {
        programada = aInstante(dto.programada_para, congreso.zona_horaria);
        const falta = programada.getTime() - Date.now();
        if (falta < MINIMO_MS) throw new BadRequestException('La hora programada ya pasó (o es en menos de un minuto)');
        if (falta > MAXIMO_MS) throw new BadRequestException('Solo se puede programar hasta un año adelante');
      }

      return tx.notificacion.create({
        data: {
          organizacion_id: orgId,
          congreso_id: congresoId,
          titulo: dto.titulo.trim(),
          cuerpo: dto.cuerpo.trim(),
          destino,
          sesion_id: conSesion ? dto.sesion_id : null,
          creado_por_id: usuarioId,
          estado: programada ? 'programada' : 'enviando',
          programada_para: programada,
        },
      });
    });

    // Si es inmediato, se despacha YA (fuera de la transacción de creación).
    if (notificacion.estado === 'enviando') {
      return this.despachar(orgId, notificacion.id);
    }
    return notificacion;
  }

  /**
   * Envía un aviso que está en estado "enviando". Lo usan el envío inmediato y
   * el programador.
   *
   * 1. Busca los teléfonos de los inscritos (con RLS).
   * 2. Le pide a Expo que entregue (FUERA de la transacción: es una llamada
   *    por internet y no debe tener la base esperando).
   * 3. Guarda el resultado y apaga los tokens que Expo dio por muertos.
   */
  async despachar(orgId: string, notificacionId: string) {
    const { notificacion, tokens } = await this.prisma.runInTenant(orgId, async (tx) => {
      const notificacion = await tx.notificacion.findFirst({ where: { id: notificacionId } });
      if (!notificacion) throw new NotFoundException('Notificación no encontrada');

      const inscritos = await tx.inscripcion.findMany({
        where: {
          congreso_id: notificacion.congreso_id,
          estado: 'confirmada',
          // 8.7.e: "favoritos" -> solo quienes marcaron esa charla con ⭐.
          ...(notificacion.destino === 'favoritos' && notificacion.sesion_id
            ? { usuario: { sesiones_favoritas: { some: { sesion_id: notificacion.sesion_id } } } }
            : {}),
        },
        select: { usuario_id: true },
      });
      const dispositivos = await tx.dispositivoPush.findMany({
        where: { usuario_id: { in: inscritos.map((i) => i.usuario_id) }, activo: true },
        select: { expo_push_token: true },
      });
      // Un mismo token no debe recibir el aviso dos veces.
      return { notificacion, tokens: [...new Set(dispositivos.map((d) => d.expo_push_token))] };
    });

    const resultado = await this.push.enviar(
      tokens.map((to) => ({
        to,
        title: notificacion.titulo,
        body: notificacion.cuerpo,
        // La app usa esto para abrir el congreso (o la charla) al tocar la push.
        data: {
          congresoId: notificacion.congreso_id,
          ...(notificacion.sesion_id ? { sesionId: notificacion.sesion_id } : {}),
        },
      })),
    );

    return this.prisma.runInTenant(orgId, async (tx) => {
      if (resultado.tokensInvalidos.length > 0) {
        await tx.dispositivoPush.updateMany({
          where: { expo_push_token: { in: resultado.tokensInvalidos } },
          data: { activo: false },
        });
      }
      // "fallida" solo si había teléfonos y no llegó a NINGUNO. Si no había
      // teléfonos (todos en Expo Go), el aviso igual queda en la bandeja: enviada.
      const estado = tokens.length > 0 && resultado.enviados === 0 ? 'fallida' : 'enviada';
      return tx.notificacion.update({
        where: { id: notificacionId },
        data: {
          estado,
          enviados: resultado.enviados,
          fallidos: resultado.fallidos,
          enviado_en: new Date(),
        },
      });
    });
  }

  /**
   * Reclamar un aviso programado antes de enviarlo: lo pasa de "programada" a
   * "enviando" SOLO si sigue en "programada". Si dos procesos lo intentan a la
   * vez, solo a uno le funciona (count = 1); el otro recibe 0 y lo deja.
   */
  async reclamar(orgId: string, notificacionId: string): Promise<boolean> {
    const r = await this.prisma.runInTenant(orgId, (tx) =>
      tx.notificacion.updateMany({
        where: { id: notificacionId, estado: 'programada' },
        data: { estado: 'enviando' },
      }),
    );
    return r.count === 1;
  }

  /** Historial para el panel: todo, lo más nuevo primero. */
  async listar(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      return tx.notificacion.findMany({
        where: { congreso_id: congresoId },
        orderBy: { creado_en: 'desc' },
        include: {
          sesion: { select: { id: true, titulo: true } },
          creado_por: { select: { nombre: true } },
        },
      });
    });
  }

  /**
   * Bandeja "Avisos" de la app: lo ya despachado, lo más nuevo primero.
   * Incluye los "fallida": la push no llegó a ningún teléfono, pero el aviso es
   * válido y justamente por eso tiene que poder leerse aquí.
   */
  async avisos(orgId: string, congresoId: string, usuarioId?: string, rol?: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      // 8.7.e: a un asistente, los avisos "favoritos" solo le salen si marcó
      // esa charla (si no, no le llegó la push y tampoco debe verlo aquí).
      const soloLosMios =
        rol === 'participante' && usuarioId
          ? {
              OR: [
                { destino: { not: 'favoritos' } },
                { sesion: { favoritas: { some: { usuario_id: usuarioId } } } },
              ],
            }
          : {};
      return tx.notificacion.findMany({
        where: { congreso_id: congresoId, estado: { in: ['enviada', 'fallida'] }, ...soloLosMios },
        orderBy: { enviado_en: 'desc' },
        take: 100,
        select: {
          id: true,
          titulo: true,
          cuerpo: true,
          enviado_en: true,
          sesion: { select: { id: true, titulo: true } },
        },
      });
    });
  }

  /** Cancelar un aviso programado (los ya enviados no se pueden "desenviar"). */
  async cancelar(orgId: string, id: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const n = await tx.notificacion.findFirst({ where: { id } });
      if (!n) throw new NotFoundException('Notificación no encontrada');
      if (n.estado !== 'programada') {
        throw new ConflictException('Solo se pueden cancelar los avisos programados que aún no se envían');
      }
      await tx.notificacion.delete({ where: { id } });
      return { cancelada: true };
    });
  }

  /**
   * Registrar el teléfono de quien está logueado (lo llama la app al entrar).
   * Si ya existía, lo reactiva y actualiza la fecha (visto_en es @updatedAt).
   */
  async registrarDispositivo(orgId: string, usuarioId: string, dto: RegistrarDispositivoDto) {
    return this.prisma.runInTenant(orgId, (tx) =>
      tx.dispositivoPush.upsert({
        where: { usuario_id_expo_push_token: { usuario_id: usuarioId, expo_push_token: dto.expo_push_token } },
        update: { activo: true, ...(dto.plataforma ? { plataforma: dto.plataforma } : {}) },
        create: {
          organizacion_id: orgId,
          usuario_id: usuarioId,
          expo_push_token: dto.expo_push_token,
          plataforma: dto.plataforma ?? null,
        },
      }),
    );
  }

  /** Al cerrar sesión: ese teléfono deja de recibir avisos de esta persona. */
  async desactivarDispositivo(orgId: string, usuarioId: string, token: string) {
    const r = await this.prisma.runInTenant(orgId, (tx) =>
      tx.dispositivoPush.updateMany({
        where: { usuario_id: usuarioId, expo_push_token: token },
        data: { activo: false },
      }),
    );
    return { desactivados: r.count };
  }
}
