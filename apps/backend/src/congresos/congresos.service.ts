import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ordenarSponsors } from '../sponsors/sponsors.service';
import { SPONSORS_DE_CHARLA } from './sesiones.service';
import { CrearCongresoDto } from './dto/crear-congreso.dto';
import { ActualizarCongresoDto } from './dto/actualizar-congreso.dto';
import { aInstante, diaEnZona } from './zona-horaria.util';

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

  /**
   * Listar los congresos del tenant (el RLS filtra la organización).
   * 8.7.b: con `soloDeUsuario` (un asistente) devuelve SOLO aquellos en los que
   * tiene una inscripción confirmada: "ve solo su congreso".
   */
  listar(orgId: string, soloDeUsuario?: string) {
    return this.prisma.runInTenant(orgId, (tx) =>
      tx.congreso.findMany({
        where: soloDeUsuario
          ? { inscripciones: { some: { usuario_id: soloDeUsuario, estado: 'confirmada' } } }
          : undefined,
        orderBy: { fecha_inicio: 'asc' },
        // 8.7.h: para pintar las tarjetas del panel (portada con sus colores,
        // logo y los conteos) sin pedir el detalle de cada congreso.
        include: {
          personalizacion: { select: { logo_url: true, color_primario: true, color_secundario: true } },
          _count: {
            // 8.10 (decisión 41): el conteo dice "N charlas" -> sin contar los breaks.
            select: { sesiones: { where: { tipo: { not: 'break' } } }, inscripciones: { where: { estado: 'confirmada' } } },
          },
        },
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
            include: {
              ponentes: { include: { ponente: true } },
              _count: { select: { favoritas: true } }, // 8.7.e: "⭐ 34" (solo el número)
              sponsors: SPONSORS_DE_CHARLA, // 8.7.f: "Patrocinada por…"
            },
          },
          ponentes: true,
          // 8.5: los sponsors van en el detalle para que la app pinte la franja
          // "Con el apoyo de" sin otra llamada. El orden por nivel se hace abajo.
          sponsors: true,
          // 8.5: la marca del evento (logo, portada, colores). null si aún no la tiene.
          personalizacion: true,
          // 8.7.h: inscritos confirmados, para la portada del congreso en el panel.
          _count: { select: { inscripciones: { where: { estado: 'confirmada' } } } },
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

      // ---- 8.7.h: cambiar las FECHAS (o la zona) sin dejar la agenda rota ----
      const dia = (d: Date) => d.toISOString().slice(0, 10); // fechas del congreso: medianoche UTC
      const nuevoInicio = dto.fecha_inicio ? dto.fecha_inicio.slice(0, 10) : dia(existe.fecha_inicio);
      const nuevoFin = dto.fecha_fin ? dto.fecha_fin.slice(0, 10) : dia(existe.fecha_fin);
      if (nuevoFin < nuevoInicio) {
        throw new BadRequestException('La fecha de fin no puede ser anterior a la de inicio.');
      }
      const cambianFechas = nuevoInicio !== dia(existe.fecha_inicio) || nuevoFin !== dia(existe.fecha_fin);
      const cambiaZona = dto.zona_horaria !== undefined && dto.zona_horaria !== existe.zona_horaria;

      if (cambianFechas || cambiaZona) {
        const sesiones = await tx.sesion.findMany({
          where: { congreso_id: id },
          select: { id: true, inicio: true, fin: true },
        });

        // La zona dice cómo se LEEN las horas guardadas: cambiarla con la
        // agenda armada movería todas las charlas de hora sin avisar.
        if (cambiaZona && sesiones.length > 0) {
          throw new ConflictException(
            'No se puede cambiar la zona horaria de un congreso que ya tiene sesiones: cambiarían las horas de toda la agenda.',
          );
        }

        const zona = existe.zona_horaria;
        const delta = Math.round((Date.parse(nuevoInicio) - Date.parse(dia(existe.fecha_inicio))) / 86_400_000);

        if (dto.correr_sesiones && delta !== 0 && sesiones.length > 0) {
          // Cada sesión se corre `delta` días conservando la HORA DEL RELOJ en
          // la zona del evento ("09:00 del 20" -> "09:00 del 23"), aunque en
          // medio haya un cambio de horario de verano.
          const correr = (d: Date) => {
            const reloj = relojEnZona(d, zona); // "2026-10-20T09:00"
            const nuevoDia = new Date(Date.parse(reloj.slice(0, 10)) + delta * 86_400_000).toISOString().slice(0, 10);
            return aInstante(`${nuevoDia}${reloj.slice(10)}`, zona);
          };
          for (const s of sesiones) {
            const inicio = correr(s.inicio);
            const fin = correr(s.fin);
            await tx.sesion.update({ where: { id: s.id }, data: { inicio, fin } });
            s.inicio = inicio;
            s.fin = fin;
          }
        }

        // Ninguna sesión puede quedar en un día que ya no es del congreso.
        // (Si esto falla, la transacción se deshace: tampoco se corre nada.)
        const fuera = sesiones.filter((s) => {
          const d = diaEnZona(s.inicio, zona);
          return d < nuevoInicio || d > nuevoFin;
        });
        if (fuera.length > 0) {
          const dias = [...new Set(fuera.map((s) => diaEnZona(s.inicio, zona)))].sort();
          throw new ConflictException(
            `${fuera.length} ${fuera.length === 1 ? 'charla quedaría' : 'charlas quedarían'} fuera de las nuevas fechas (${dias.join(', ')}). ` +
              'Marca "Correr la agenda" para moverlas con el congreso, o muévelas o bórralas primero desde la Agenda.',
          );
        }
      }

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
      await tx.sesionSponsor.deleteMany({ where: { sponsor: { congreso_id: id } } }); // 8.7.f: las parejas primero
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
      await tx.sesionFavorita.deleteMany({ where: { sesion: { congreso_id: id } } }); // 8.7.e
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

/** "2026-10-20T09:00": la hora que marca el reloj en `zona` en ese instante. */
function relojEnZona(d: Date, zona: string): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}
