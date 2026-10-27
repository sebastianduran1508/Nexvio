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

      return tx.sesion.create({
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
        include: { ponentes: { include: { ponente: true } } },
      });
    });
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
      });
    });
  }

  /** Borrar una sesión del tenant (y sus vínculos con ponentes). */
  async borrar(orgId: string, id: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.sesion.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Sesión no encontrada');

      await tx.sesionPonente.deleteMany({ where: { sesion_id: id } });
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
