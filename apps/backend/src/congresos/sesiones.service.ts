import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { aInstante, diaEnZona } from './zona-horaria.util';

/** Lo mínimo del congreso que hace falta para validar una sesión. */
type CongresoAgenda = {
  fecha_inicio: Date;
  fecha_fin: Date;
  zona_horaria: string;
};

/**
 * Lógica de la agenda: las sesiones de un congreso y qué ponentes exponen en cada una.
 * Mismo principio que congresos: todo dentro de runInTenant, RLS filtrando.
 *
 * Bloque 8.4 — reglas de negocio de la agenda:
 *  1. Las horas sin zona son hora del LUGAR DEL EVENTO (congreso.zona_horaria).
 *  2. Una sesión termina DESPUÉS de empezar.
 *  3. Una sesión cae DENTRO de las fechas del congreso (contadas en su zona).
 *  4. Un break no lleva ponentes.
 *  5. Un ponente solo se asigna a sesiones de SU MISMO congreso.
 */
@Injectable()
export class SesionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reglas 2 y 3. Recibe instantes ya convertidos.
   *
   * Por qué el día se calcula "en la zona del congreso": una charla a las
   * 21:00 en Bogotá ya es el día siguiente en UTC (02:00Z). Si comparáramos en
   * UTC, la rechazaríamos por "fuera de fechas" en el último día del evento.
   */
  private validarHorario(congreso: CongresoAgenda, inicio: Date, fin: Date) {
    if (fin.getTime() <= inicio.getTime()) {
      throw new BadRequestException('La sesión debe terminar después de empezar');
    }
    // Las fechas del congreso son fechas "puras": se leen en UTC ("2026-10-24").
    const desde = congreso.fecha_inicio.toISOString().slice(0, 10);
    const hasta = congreso.fecha_fin.toISOString().slice(0, 10);
    const diaIni = diaEnZona(inicio, congreso.zona_horaria);
    const diaFin = diaEnZona(fin, congreso.zona_horaria);
    if (diaIni < desde || diaFin > hasta) {
      throw new BadRequestException(
        `La sesión debe estar dentro de las fechas del congreso (${desde} a ${hasta})`,
      );
    }
  }

  /** Crear una sesión dentro de un congreso del tenant. */
  async crear(orgId: string, congresoId: string, dto: CrearSesionDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      // Verificamos que el congreso exista y sea del tenant (RLS lo filtra).
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      const inicio = aInstante(dto.inicio, congreso.zona_horaria);
      const fin = aInstante(dto.fin, congreso.zona_horaria);
      this.validarHorario(congreso, inicio, fin);
      if (dto.sponsor_ids?.length) await this.validarSponsors(tx, congresoId, dto.sponsor_ids);

      const creada = await tx.sesion.create({
        data: {
          organizacion_id: orgId,
          congreso_id: congresoId,
          titulo: dto.titulo,
          inicio,
          fin,
          ...(dto.sala !== undefined ? { sala: dto.sala } : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        },
      });
      if (dto.sponsor_ids?.length) await this.fijarSponsors(tx, orgId, creada.id, dto.sponsor_ids);
      return creada;
    });
  }

  /**
   * 8.7.f: todos los sponsors deben ser de ESTE congreso (con el RLS ya no
   * pueden ser de otra organización, pero sí de otro congreso de la misma).
   */
  private async validarSponsors(tx: any, congresoId: string, ids: string[]) {
    const unicos = [...new Set(ids)];
    const n = await tx.sponsor.count({ where: { id: { in: unicos }, congreso_id: congresoId } });
    if (n !== unicos.length) throw new BadRequestException('Algún sponsor no es de este congreso');
  }

  /** Reemplaza los sponsors de una charla por `ids`, en ese orden. */
  private async fijarSponsors(tx: any, orgId: string, sesionId: string, ids: string[]) {
    await tx.sesionSponsor.deleteMany({ where: { sesion_id: sesionId } });
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return;
    await tx.sesionSponsor.createMany({
      data: unicos.map((sponsor_id, orden) => ({ organizacion_id: orgId, sesion_id: sesionId, sponsor_id, orden })),
    });
  }

  /** Listar las sesiones de un congreso, con sus ponentes. */
  async listar(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      return tx.sesion.findMany({
        where: { congreso_id: congresoId },
        // Por hora de inicio y, si empatan, por el campo `orden`.
        orderBy: [{ inicio: 'asc' }, { orden: 'asc' }],
        include: {
          ponentes: { include: { ponente: true } },
          // 8.7.e: cuántos la tienen en "Mi agenda" (el panel muestra "⭐ 34").
          // Es solo un número: nunca QUIÉNES la marcaron.
          _count: { select: { favoritas: true } },
          sponsors: SPONSORS_DE_CHARLA, // 8.7.f
        },
      });
    });
  }

  /**
   * 8.7.h: UNA sesión con su contexto (congreso, marca, ponentes, sponsors y
   * cuántos la marcaron con ⭐). Lo usa la pantalla de moderación en vivo del
   * panel para el encabezado. Solo staff (ver el controlador).
   */
  async obtener(orgId: string, id: string) {
    const sesion = await this.prisma.runInTenant(orgId, (tx) =>
      tx.sesion.findFirst({
        where: { id },
        include: {
          congreso: {
            select: {
              id: true,
              nombre: true,
              zona_horaria: true,
              personalizacion: { select: { logo_url: true, color_primario: true, color_secundario: true } },
            },
          },
          ponentes: { include: { ponente: { select: { id: true, nombre: true, cargo: true, foto_url: true } } } },
          sponsors: SPONSORS_DE_CHARLA,
          _count: { select: { favoritas: true } },
        },
      }),
    );
    if (!sesion) throw new NotFoundException('Sesión no encontrada');
    return sesion;
  }

  /**
   * Actualizar una sesión del tenant.
   *
   * Ojo: aunque llegue solo el `fin`, se valida la sesión COMPLETA (el fin
   * nuevo contra el inicio que ya tenía). Por eso se mezcla lo nuevo con lo
   * que ya estaba guardado antes de validar.
   */
  async actualizar(orgId: string, id: string, dto: ActualizarSesionDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sesion.findFirst({
        where: { id },
        include: { congreso: true, _count: { select: { ponentes: true } } },
      });
      if (!existe) throw new NotFoundException('Sesión no encontrada');
      if (dto.sponsor_ids?.length) await this.validarSponsors(tx, existe.congreso_id, dto.sponsor_ids); // 8.7.f

      const zona = existe.congreso.zona_horaria;
      const inicio = dto.inicio !== undefined ? aInstante(dto.inicio, zona) : existe.inicio;
      const fin = dto.fin !== undefined ? aInstante(dto.fin, zona) : existe.fin;
      if (dto.inicio !== undefined || dto.fin !== undefined) {
        this.validarHorario(existe.congreso, inicio, fin);
      }

      // Regla 4: convertir en break una sesión que tiene ponentes.
      if (dto.tipo === 'break' && existe._count.ponentes > 0) {
        throw new ConflictException(
          'Esta sesión tiene ponentes asignados: quítalos antes de convertirla en break',
        );
      }

      // "Correr la agenda": mover lo que venía después, dentro de esta misma
      // transacción (si una sola falla la validación, no se mueve nada).
      if (dto.correr_siguientes && dto.fin !== undefined) {
        await this.correrSiguientes(tx, existe, fin);
      }

      // 8.7.f: si llega la lista, reemplaza a los sponsors (en ese orden).
      if (dto.sponsor_ids !== undefined) await this.fijarSponsors(tx, existe.organizacion_id, id, dto.sponsor_ids);

      return tx.sesion.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
          ...(dto.inicio !== undefined ? { inicio } : {}),
          ...(dto.fin !== undefined ? { fin } : {}),
          ...(dto.sala !== undefined ? { sala: dto.sala } : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        },
        include: { sponsors: SPONSORS_DE_CHARLA },
      });
    });
  }

  /**
   * Corre las sesiones que venían DESPUÉS de una que cambió de hora de fin.
   *
   * "Después" = mismo congreso, mismo día (en la zona del evento) y que
   * empezaban a partir del fin VIEJO. Se mueven exactamente lo mismo que se
   * movió el fin (si se acortó, se adelantan). Cada sesión movida se valida
   * igual que una nueva: no puede salirse de las fechas del congreso.
   */
  private async correrSiguientes(
    tx: any,
    sesion: { id: string; congreso_id: string; inicio: Date; fin: Date; congreso: CongresoAgenda },
    finNuevo: Date,
  ) {
    const delta = finNuevo.getTime() - sesion.fin.getTime();
    if (delta === 0) return;

    const zona = sesion.congreso.zona_horaria;
    const dia = diaEnZona(sesion.inicio, zona);
    const candidatas: { id: string; titulo: string; inicio: Date; fin: Date }[] =
      await tx.sesion.findMany({
        where: {
          congreso_id: sesion.congreso_id,
          id: { not: sesion.id },
          inicio: { gte: sesion.fin },
        },
        select: { id: true, titulo: true, inicio: true, fin: true },
      });

    for (const s of candidatas.filter((c) => diaEnZona(c.inicio, zona) === dia)) {
      const inicio = new Date(s.inicio.getTime() + delta);
      const fin = new Date(s.fin.getTime() + delta);
      try {
        this.validarHorario(sesion.congreso, inicio, fin);
      } catch {
        throw new BadRequestException(
          `Correr la agenda dejaría «${s.titulo}» fuera de las fechas del congreso`,
        );
      }
      await tx.sesion.update({ where: { id: s.id }, data: { inicio, fin } });
    }
  }

  /** Borrar una sesión del tenant (con sus ponentes asignados, su participación y el enlace de sus avisos). */
  async borrar(orgId: string, id: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sesion.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sesión no encontrada');

      await tx.sesionPonente.deleteMany({ where: { sesion_id: id } });
      await tx.sesionFavorita.deleteMany({ where: { sesion_id: id } }); // 8.7.e
      await tx.sesionSponsor.deleteMany({ where: { sesion_id: id } }); // 8.7.f
      // Fase 5: la participación cuelga de la sesión (encuestas -> opciones y
      // votos; preguntas). Se borra en orden, de las hojas hacia la raíz.
      // (Antes del 8.6 esto faltaba: borrar una charla con preguntas fallaba.)
      const encuestas = await tx.encuesta.findMany({ where: { sesion_id: id }, select: { id: true } });
      const encuestaIds = encuestas.map((e) => e.id);
      if (encuestaIds.length > 0) {
        await tx.respuestaEncuesta.deleteMany({ where: { encuesta_id: { in: encuestaIds } } });
        await tx.opcionEncuesta.deleteMany({ where: { encuesta_id: { in: encuestaIds } } });
      }
      await tx.encuesta.deleteMany({ where: { sesion_id: id } });
      await tx.pregunta.deleteMany({ where: { sesion_id: id } });
      // 8.6: los avisos SOBRE esta sesión se conservan en el historial (ya se
      // enviaron); solo pierden el enlace, para no chocar con la clave foránea.
      await tx.notificacion.updateMany({ where: { sesion_id: id }, data: { sesion_id: null } });
      await tx.sesion.delete({ where: { id } });
      return { borrado: true };
    });
  }

  /**
   * Asignar un ponente a una sesión (crea la fila en la tabla intermedia).
   * Ambos (sesión y ponente) deben ser del tenant; el RLS los hace invisibles
   * si son de otra organización -> 404.
   */
  async asignarPonente(orgId: string, sesionId: string, ponenteId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const sesion = await tx.sesion.findFirst({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundException('Sesión no encontrada');

      const ponente = await tx.ponente.findFirst({ where: { id: ponenteId } });
      if (!ponente) throw new NotFoundException('Ponente no encontrado');

      // Regla 4: los breaks no llevan ponentes.
      if (sesion.tipo === 'break') {
        throw new BadRequestException('Los breaks no llevan ponentes');
      }
      // Regla 5: mismo tenant no basta. Una organización puede tener varios
      // congresos, y el ponente de uno no debe aparecer en la agenda de otro.
      if (ponente.congreso_id !== sesion.congreso_id) {
        throw new BadRequestException('El ponente pertenece a otro congreso');
      }

      // ¿Ya estaba asignado? El @@unique(sesion_id, ponente_id) también lo evita
      // a nivel BD, pero damos un mensaje claro (409) en vez de un error feo.
      const ya = await tx.sesionPonente.findFirst({
        where: { sesion_id: sesionId, ponente_id: ponenteId },
      });
      if (ya) throw new ConflictException('El ponente ya está asignado a esta sesión');

      return tx.sesionPonente.create({
        data: {
          organizacion_id: orgId,
          sesion_id: sesionId,
          ponente_id: ponenteId,
        },
      });
    });
  }

  /** Quitar un ponente de una sesión (borra la fila de la tabla intermedia). */
  async quitarPonente(orgId: string, sesionId: string, ponenteId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const vinculo = await tx.sesionPonente.findFirst({
        where: { sesion_id: sesionId, ponente_id: ponenteId },
      });
      if (!vinculo) throw new NotFoundException('El ponente no está asignado a esa sesión');

      await tx.sesionPonente.delete({ where: { id: vinculo.id } });
      return { borrado: true };
    });
  }
}

/** 8.7.f: los sponsors de una charla, en su orden, con lo que se muestra de cada uno. */
export const SPONSORS_DE_CHARLA = {
  orderBy: { orden: 'asc' },
  select: { sponsor: { select: { id: true, nombre: true, logo_url: true, sitio_web: true, nivel: true } } },
} as const;
