import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CrearEncuestaDto } from './dto/crear-encuesta.dto';

const ROLES_STAFF = ['admin', 'organizador', 'coordinador'];

/**
 * Encuestas en tiempo real (Fase 5). El staff crea una encuesta con opciones,
 * la abre/cierra, y los asistentes votan (1 voto por persona). Los resultados
 * son un conteo de votos por opcion.
 *
 * Tras crear/abrir-cerrar/votar, avisamos a la sala de la sesion por Socket.io
 * para que los resultados se muevan en vivo (patron "avisar y refrescar").
 */
/** 9.13.b: ventana para juntar los avisos de encuestas de una charla. */
const AGRUPAR_AVISOS_MS = 1000;

@Injectable()
export class EncuestasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Arma el resultado de una encuesta (opciones con conteo, total y tu voto). */
  private async resultado(tx: any, encuestaId: string, usuarioId?: string) {
    const encuesta = await tx.encuesta.findFirst({
      where: { id: encuestaId },
      include: { opciones: true },
    });
    if (!encuesta) throw new NotFoundException('Encuesta no encontrada');

    const conteos = await tx.respuestaEncuesta.groupBy({
      by: ['opcion_id'],
      where: { encuesta_id: encuestaId },
      _count: { _all: true },
    });
    const mapa = new Map<string, number>(
      conteos.map((c: any) => [c.opcion_id, c._count._all]),
    );

    const miVoto = usuarioId
      ? await tx.respuestaEncuesta.findFirst({
          where: { encuesta_id: encuestaId, usuario_id: usuarioId },
          select: { opcion_id: true },
        })
      : null;

    const opciones = encuesta.opciones.map((o: any) => ({
      id: o.id,
      texto: o.texto,
      votos: mapa.get(o.id) ?? 0,
    }));
    const total = opciones.reduce((a: number, o: any) => a + o.votos, 0);

    return {
      id: encuesta.id,
      pregunta: encuesta.pregunta,
      activa: encuesta.activa,
      opciones,
      total,
      miVoto: miVoto?.opcion_id ?? null,
    };
  }

  /**
   * AVISO EN VIVO AGRUPADO (Fase 9 · 9.13.b).
   *
   * Antes: cada voto avisaba a TODA la sala y cada teléfono volvía a pedir los
   * resultados. Con 700 personas votando en 30 s eran ~490.000 pedidos (la
   * "avalancha de refrescos" de la prueba de carga).
   *
   * Ahora:
   *  1. Como mucho UN aviso por segundo por charla: los votos que lleguen en
   *     ese segundo se juntan en uno solo.
   *  2. El aviso lleva los RESULTADOS de las encuestas activas (sin el voto de
   *     nadie en particular): la app actualiza las barras sin pedir nada. Cada
   *     quien conserva SU voto, que ya conoce (se lo devolvió `votar`).
   *
   * Ejemplo: 700 votos en 30 s → ~30 avisos con resultados y ~30 consultas a
   * la base, en vez de 700 avisos y 490.000 peticiones.
   */
  private readonly avisosPendientes = new Map<string, ReturnType<typeof setTimeout>>();

  private avisar(orgId: string, sesionId: string) {
    if (this.avisosPendientes.has(sesionId)) return; // ya hay uno en camino: este voto viaja en él
    const reloj = setTimeout(() => {
      this.avisosPendientes.delete(sesionId);
      this.prisma
        .runInTenant(orgId, async (tx) => {
          const activas = await tx.encuesta.findMany({
            where: { sesion_id: sesionId, activa: true },
            orderBy: { creado_en: 'asc' },
            select: { id: true },
          });
          return Promise.all(activas.map((e: any) => this.resultado(tx, e.id)));
        })
        .then((lista) => {
          // Sin "miVoto": es igual para todos; cada app conserva el suyo.
          const generales = lista.map(({ miVoto, ...r }: any) => r);
          this.realtime.encuestasCambiaron(sesionId, generales);
        })
        .catch(() => this.realtime.encuestasCambiaron(sesionId)); // sin datos: que refresquen
    }, AGRUPAR_AVISOS_MS);
    this.avisosPendientes.set(sesionId, reloj);
  }

  /** Crear una encuesta (cerrada por defecto) con sus opciones. */
  async crear(orgId: string, sesionId: string, dto: CrearEncuestaDto) {
    const res = await this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Charla no encontrada');

      const encuesta = await tx.encuesta.create({
        data: { organizacion_id: orgId, sesion_id: sesionId, pregunta: dto.pregunta },
      });
      await tx.opcionEncuesta.createMany({
        data: dto.opciones.map((texto) => ({
          organizacion_id: orgId,
          encuesta_id: encuesta.id,
          texto,
        })),
      });
      return this.resultado(tx, encuesta.id);
    });

    this.avisar(orgId, sesionId); // 9.13.b: agrupado y con los resultados
    return res;
  }

  /** Listar encuestas de una sesion (staff: todas; asistente: solo las activas). */
  async listar(orgId: string, rol: string, sesionId: string, usuarioId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Charla no encontrada');

      const esStaff = ROLES_STAFF.includes(rol);
      const encuestas = await tx.encuesta.findMany({
        where: { sesion_id: sesionId, ...(esStaff ? {} : { activa: true }) },
        orderBy: { creado_en: 'asc' },
        select: { id: true },
      });
      return Promise.all(encuestas.map((e: any) => this.resultado(tx, e.id, usuarioId)));
    });
  }

  /** Abrir/cerrar la votacion de una encuesta. */
  async cambiarEstado(orgId: string, id: string, activa: boolean) {
    const { res, sesionId } = await this.prisma.runInTenant(orgId, async (tx) => {
      const encuesta = await tx.encuesta.findFirst({ where: { id } });
      if (!encuesta) throw new NotFoundException('Encuesta no encontrada');
      await tx.encuesta.update({ where: { id }, data: { activa } });
      return { res: await this.resultado(tx, id), sesionId: encuesta.sesion_id };
    });

    this.avisar(orgId, sesionId); // 9.13.b: agrupado y con los resultados
    return res;
  }

  /** Votar una opcion. Reglas: encuesta activa, opcion valida, 1 voto por persona. */
  async votar(orgId: string, usuarioId: string, encuestaId: string, opcionId: string) {
    const { res, sesionId } = await this.prisma.runInTenant(orgId, async (tx) => {
      const encuesta = await tx.encuesta.findFirst({ where: { id: encuestaId } });
      if (!encuesta) throw new NotFoundException('Encuesta no encontrada');
      if (!encuesta.activa) throw new BadRequestException('La encuesta esta cerrada');

      const opcion = await tx.opcionEncuesta.findFirst({
        where: { id: opcionId, encuesta_id: encuestaId },
      });
      if (!opcion) throw new NotFoundException('Opcion no valida');

      const ya = await tx.respuestaEncuesta.findFirst({
        where: { encuesta_id: encuestaId, usuario_id: usuarioId },
      });
      if (ya) throw new ConflictException('Ya votaste en esta encuesta');

      await tx.respuestaEncuesta.create({
        data: {
          organizacion_id: orgId,
          encuesta_id: encuestaId,
          opcion_id: opcionId,
          usuario_id: usuarioId,
        },
      });
      return {
        res: await this.resultado(tx, encuestaId, usuarioId),
        sesionId: encuesta.sesion_id,
      };
    });

    this.avisar(orgId, sesionId); // 9.13.b: agrupado y con los resultados
    return res;
  }

  /** Resultados actuales de una encuesta (para refrescar la vista). */
  async resultados(orgId: string, id: string, usuarioId: string) {
    return this.prisma.runInTenant(orgId, (tx) => this.resultado(tx, id, usuarioId));
  }
}
