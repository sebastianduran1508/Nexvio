import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearCongresoDto } from './dto/crear-congreso.dto';
import { ActualizarCongresoDto } from './dto/actualizar-congreso.dto';

/**
 * Lógica de negocio de los congresos.
 *
 * Regla transversal: TODA operación corre dentro de runInTenant(orgId, ...),
 * que fija app.org_id y deja que el RLS filtre. Por eso aquí NUNCA verás un
 * `where: { organizacion_id }` en las lecturas: la base ya nos "esposa" al tenant.
 * En las escrituras SÍ estampamos organizacion_id, porque el RLS (WITH CHECK)
 * exige que las filas nuevas pertenezcan a la organización activa.
 */
@Injectable()
export class CongresosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crear un congreso para la organización activa. */
  crear(orgId: string, dto: CrearCongresoDto) {
    return this.prisma.runInTenant(orgId, (tx) =>
      tx.congreso.create({
        data: {
          organizacion_id: orgId, // el RLS exige que sea el del tenant
          nombre: dto.nombre,
          fecha_inicio: new Date(dto.fecha_inicio),
          fecha_fin: new Date(dto.fecha_fin),
          ...(dto.estado ? { estado: dto.estado } : {}),
        },
      }),
    );
  }

  /** Listar los congresos del tenant (el RLS filtra solo). */
  listar(orgId: string) {
    return this.prisma.runInTenant(orgId, (tx) =>
      tx.congreso.findMany({
        orderBy: { fecha_inicio: 'asc' },
      }),
    );
  }

  /** Detalle de un congreso, con su agenda (sesiones) y sus ponentes. */
  async obtener(orgId: string, id: string) {
    const congreso = await this.prisma.runInTenant(orgId, (tx) =>
      tx.congreso.findFirst({
        where: { id },
        include: {
          sesiones: { orderBy: { inicio: 'asc' } },
          ponentes: true,
        },
      }),
    );
    // Si no existe (o es de otra organización, invisible por RLS) -> 404.
    if (!congreso) throw new NotFoundException('Congreso no encontrado');
    return congreso;
  }

  /** Actualizar un congreso del tenant. */
  async actualizar(orgId: string, id: string, dto: ActualizarCongresoDto) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      // findFirst pasa por el RLS: si es de otro tenant, devuelve null -> 404.
      const existe = await tx.congreso.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Congreso no encontrado');

      return tx.congreso.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.fecha_inicio !== undefined
            ? { fecha_inicio: new Date(dto.fecha_inicio) }
            : {}),
          ...(dto.fecha_fin !== undefined
            ? { fecha_fin: new Date(dto.fecha_fin) }
            : {}),
          ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        },
      });
    });
  }

  /** Borrar un congreso del tenant (y en cascada su agenda/ponentes, ver nota). */
  async borrar(orgId: string, id: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.congreso.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Congreso no encontrado');

      // Borramos primero lo que depende del congreso (no hay ON DELETE CASCADE
      // configurado), para no violar las llaves foráneas.
      const sesiones = await tx.sesion.findMany({
        where: { congreso_id: id },
        select: { id: true },
      });
      const sesionIds = sesiones.map((s) => s.id);
      if (sesionIds.length > 0) {
        await tx.sesionPonente.deleteMany({ where: { sesion_id: { in: sesionIds } } });
      }
      await tx.sesionPonente.deleteMany({ where: { ponente: { congreso_id: id } } });
      await tx.sesion.deleteMany({ where: { congreso_id: id } });
      await tx.ponente.deleteMany({ where: { congreso_id: id } });
      // Fase 4: tambien las inscripciones cuelgan del congreso.
      await tx.inscripcion.deleteMany({ where: { congreso_id: id } });
      await tx.congreso.delete({ where: { id } });
      return { borrado: true };
    });
  }
}
