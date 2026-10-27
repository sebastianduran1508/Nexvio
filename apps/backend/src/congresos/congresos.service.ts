import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ordenarSponsors } from '../sponsors/sponsors.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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
          ...(dto.descripcion ? { descripcion: dto.descripcion } : {}),
          ...(dto.ciudad ? { ciudad: dto.ciudad } : {}),
          ...(dto.pais ? { pais: dto.pais } : {}),
          ...(dto.pais_codigo ? { pais_codigo: dto.pais_codigo.toUpperCase() } : {}),
          ...(dto.lugar ? { lugar: dto.lugar } : {}),
          ...(dto.zona_horaria ? { zona_horaria: dto.zona_horaria } : {}),
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
          // Cada sesión trae sus ponentes (para pintar "Dra. Ana Ríos" bajo la
          // charla en la agenda). Es un dato EXTRA en la respuesta: quien no
          // lo use, simplemente lo ignora.
          sesiones: {
            orderBy: [{ inicio: 'asc' }, { orden: 'asc' }],
            include: { ponentes: { include: { ponente: true } } },
          },
          ponentes: true,
          // 8.5: los sponsors van en el detalle para que la app pinte la franja
          // "Con el apoyo de" sin otra llamada. El orden por nivel se hace abajo.
          sponsors: true,
        },
      }),
    );
    // Si no existe (o es de otra organización, invisible por RLS) -> 404.
    if (!congreso) throw new NotFoundException('Congreso no encontrado');
    return { ...congreso, sponsors: ordenarSponsors(congreso.sponsors) };
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
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.ciudad !== undefined ? { ciudad: dto.ciudad } : {}),
          ...(dto.pais !== undefined ? { pais: dto.pais } : {}),
          ...(dto.pais_codigo !== undefined
            ? { pais_codigo: dto.pais_codigo.toUpperCase() }
            : {}),
          ...(dto.lugar !== undefined ? { lugar: dto.lugar } : {}),
          ...(dto.zona_horaria !== undefined ? { zona_horaria: dto.zona_horaria } : {}),
        },
      });
    });
  }

  /** Borrar un congreso del tenant (y en cascada su agenda/ponentes, ver nota). */
  async borrar(orgId: string, id: string) {
    const imagenes = await this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.congreso.findFirst({ where: { id } });
      if (!existe) throw new NotFoundException('Congreso no encontrado');

      // 8.5: anotamos las imágenes en Storage ANTES de borrar las filas, para
      // limpiarlas al final (fotos de ponentes, logos de sponsors, logo y
      // portada del congreso). Así no quedan archivos huérfanos en el bucket.
      const [fotos, logos, perso] = await Promise.all([
        tx.ponente.findMany({ where: { congreso_id: id }, select: { foto_url: true } }),
        tx.sponsor.findMany({ where: { congreso_id: id }, select: { logo_url: true } }),
        tx.personalizacionCongreso.findFirst({
          where: { congreso_id: id },
          select: { logo_url: true, imagen_portada_url: true },
        }),
      ]);

      // 8.1/8.5: tablas que nacieron después de escribir este borrado. Las
      // notificaciones pueden apuntar a una sesión, así que van ANTES de ellas.
      await tx.notificacion.deleteMany({ where: { congreso_id: id } });
      await tx.sponsor.deleteMany({ where: { congreso_id: id } });
      await tx.personalizacionCongreso.deleteMany({ where: { congreso_id: id } });

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
      // Fase 5: la participacion (preguntas y encuestas) cuelga de las sesiones.
      if (sesionIds.length > 0) {
        const encuestas = await tx.encuesta.findMany({
          where: { sesion_id: { in: sesionIds } },
          select: { id: true },
        });
        const encuestaIds = encuestas.map((e) => e.id);
        if (encuestaIds.length > 0) {
          await tx.respuestaEncuesta.deleteMany({ where: { encuesta_id: { in: encuestaIds } } });
          await tx.opcionEncuesta.deleteMany({ where: { encuesta_id: { in: encuestaIds } } });
        }
        await tx.encuesta.deleteMany({ where: { sesion_id: { in: sesionIds } } });
        await tx.pregunta.deleteMany({ where: { sesion_id: { in: sesionIds } } });
      }
      await tx.sesion.deleteMany({ where: { congreso_id: id } });
      await tx.ponente.deleteMany({ where: { congreso_id: id } });
      // Fase 4: tambien las inscripciones cuelgan del congreso.
      await tx.inscripcion.deleteMany({ where: { congreso_id: id } });
      // Fase 6: el networking (intereses/conexiones/mensajes) cuelga del congreso.
      const intereses = await tx.interesNetworking.findMany({
        where: { congreso_id: id },
        select: { id: true },
      });
      const interesIds = intereses.map((i) => i.id);
      if (interesIds.length > 0) {
        const conexiones = await tx.conexion.findMany({
          where: { interes_id: { in: interesIds } },
          select: { id: true },
        });
        const conexionIds = conexiones.map((c) => c.id);
        if (conexionIds.length > 0) {
          await tx.mensajeChat.deleteMany({ where: { conexion_id: { in: conexionIds } } });
          await tx.conexion.deleteMany({ where: { id: { in: conexionIds } } });
        }
      }
      await tx.interesNetworking.deleteMany({ where: { congreso_id: id } });
      await tx.congreso.delete({ where: { id } });

      return [
        ...fotos.map((f) => f.foto_url),
        ...logos.map((l) => l.logo_url),
        perso?.logo_url,
        perso?.imagen_portada_url,
      ];
    });

    // Las imágenes se borran DESPUÉS de la transacción: solo si el congreso
    // realmente se borró. borrarPorUrl ignora los vacíos y nunca falla.
    await Promise.all(imagenes.map((url) => this.storage.borrarPorUrl(url)));
    return { borrado: true };
  }
}
