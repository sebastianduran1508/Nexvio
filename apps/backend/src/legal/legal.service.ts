import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { DatosLegalesDto } from './dto/legal.dto';

const CAMPOS_LEGALES = [
  'legal_razon_social', 'legal_nit', 'legal_direccion', 'legal_ciudad',
  'legal_correo', 'legal_telefono', 'legal_area', 'legal_url_politica',
] as const;

/** Plazo legal de un RECLAMO (la supresión lo es): 15 días hábiles (art. 15). */
export const PLAZO_DIAS_HABILES = 15;

/**
 * LO LEGAL DEL LADO DEL STAFF (Bloque 8.7.c, Ley 1581):
 *  - los datos legales de la organización (el responsable);
 *  - la bandeja de solicitudes de los titulares y su atención.
 */
@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly authAdmin: SupabaseAdminService,
  ) {}

  // ---------------------------------------------------------------------
  // Datos legales
  // ---------------------------------------------------------------------

  async verDatosLegales(orgId: string) {
    const org = await this.prisma.runInTenant(orgId, (tx) =>
      tx.organizacion.findFirst({
        where: { id: orgId },
        select: {
          nombre: true,
          ...Object.fromEntries(CAMPOS_LEGALES.map((c) => [c, true])),
        } as any,
      }),
    );
    if (!org) throw new NotFoundException('Organización no encontrada');
    return org;
  }

  async guardarDatosLegales(orgId: string, dto: DatosLegalesDto) {
    const data: Record<string, string | null> = {};
    for (const c of CAMPOS_LEGALES) {
      const v = dto[c];
      if (v === undefined) continue;
      data[c] = v.trim() === '' ? null : v.trim();
    }
    await this.prisma.runInTenant(orgId, (tx) =>
      tx.organizacion.update({ where: { id: orgId }, data: data as Prisma.OrganizacionUpdateInput }),
    );
    return this.verDatosLegales(orgId);
  }

  // ---------------------------------------------------------------------
  // Solicitudes de los titulares
  // ---------------------------------------------------------------------

  /** Bandeja: pendientes primero (la más vieja arriba), con su plazo legal. */
  async listarSolicitudes(orgId: string) {
    const filas = await this.prisma.runInTenant(orgId, (tx) =>
      tx.solicitudDatos.findMany({
        orderBy: { creado_en: 'asc' },
        include: {
          usuario: {
            select: {
              id: true, username: true, tipo_documento: true, numero_documento: true,
              suprimido_en: true,
              inscripciones: { select: { congreso: { select: { id: true, nombre: true } } } },
            },
          },
          atendida_por: { select: { nombre: true, apellidos: true } },
        },
      }),
    );
    const orden = { pendiente: 0, atendida: 1, rechazada: 1 } as Record<string, number>;
    return filas
      .map((s) => ({ ...s, vence_en: sumarDiasHabiles(s.creado_en, PLAZO_DIAS_HABILES) }))
      .sort((a, b) => (orden[a.estado] ?? 1) - (orden[b.estado] ?? 1));
  }

  /** Rechazar (p. ej. hay un deber legal de conservar): con explicación. */
  async rechazar(orgId: string, actorId: string, id: string, respuesta: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      await this.pendiente(tx, id);
      return tx.solicitudDatos.update({
        where: { id },
        data: { estado: 'rechazada', respuesta: respuesta.trim(), atendida_en: new Date(), atendida_por_id: actorId },
      });
    });
  }

  /**
   * ATENDER UNA SUPRESIÓN = ANONIMIZAR AL TITULAR.
   *
   * No se borra la fila del usuario (rompería las estadísticas de preguntas y
   * encuestas); se le quita TODO lo que lo identifica. Un dato anonimizado ya no
   * es un dato personal. Pasos:
   *  1. Se borra su CUENTA de acceso (Supabase Auth): ya no puede entrar.
   *     Va primero y es idempotente: si algo falla después, se puede repetir.
   *  2. En UNA transacción: chats y conexiones de networking (su contenido es
   *     personal), teléfonos registrados, inscripciones; y la fila queda como
   *     "Asistente eliminado", sin documento, contacto, cargo, foto ni usuario.
   *     Sus preguntas y votos se conservan, pero ya sin nombre.
   *  3. Se borra su foto del Storage.
   * El historial de autorizaciones se conserva (sirve de prueba de que se
   * actuó bien) y la solicitud queda "atendida".
   */
  async suprimir(orgId: string, actorId: string, id: string, respuesta?: string) {
    const sol = await this.prisma.runInTenant(orgId, (tx) => this.pendiente(tx, id));
    const titularId = sol.usuario_id;
    if (!titularId) throw new ConflictException('El titular ya no existe');
    if (titularId === actorId) throw new BadRequestException('No puedes atender tu propia solicitud');

    const titular = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({ where: { id: titularId }, select: { foto_url: true, rol: true } }),
    );
    if (titular?.rol === 'admin' || titular?.rol === 'organizador') {
      throw new BadRequestException('Los datos de un organizador se suprimen desde el superadmin');
    }

    await this.authAdmin.borrarUsuario(titularId); // 1

    const ahora = new Date();
    await this.prisma.runInTenant(orgId, async (tx) => {           // 2
      const intereses = await tx.interesNetworking.findMany({
        where: { OR: [{ emisor_id: titularId }, { receptor_id: titularId }] },
        select: { id: true },
      });
      const interesIds = intereses.map((i) => i.id);
      if (interesIds.length) {
        const conexiones = await tx.conexion.findMany({ where: { interes_id: { in: interesIds } }, select: { id: true } });
        const conexionIds = conexiones.map((c) => c.id);
        if (conexionIds.length) {
          await tx.mensajeChat.deleteMany({ where: { conexion_id: { in: conexionIds } } });
          await tx.conexion.deleteMany({ where: { id: { in: conexionIds } } });
        }
        await tx.interesNetworking.deleteMany({ where: { id: { in: interesIds } } });
      }
      await tx.dispositivoPush.deleteMany({ where: { usuario_id: titularId } });
      await tx.sesionFavorita.deleteMany({ where: { usuario_id: titularId } }); // 8.7.e
      // 8.7.d: si era un speaker con cuenta, su ficha deja de apuntar a él.
      await tx.ponente.updateMany({ where: { usuario_id: titularId }, data: { usuario_id: null } });
      await tx.inscripcion.deleteMany({ where: { usuario_id: titularId } });

      await tx.usuario.update({
        where: { id: titularId },
        data: {
          nombre: 'Asistente eliminado',
          apellidos: null,
          username: null,
          email: `suprimido-${titularId}@nexvio.local`,
          tipo_documento: null,
          numero_documento: null,
          telefono: null,
          cargo: null,
          empresa: null,
          pais: null,
          pais_codigo: null,
          foto_url: null,
          descripcion: null,
          anio_nacimiento: null,
          contacto_email: null,
          linkedin_url: null,
          compartir_contacto: false,
          acepto_datos_en: null,
          politica_datos_version: null,
          debe_cambiar_password: false,
          suprimido_en: ahora,
        },
      });

      // Esta y cualquier otra solicitud pendiente del mismo titular.
      await tx.solicitudDatos.updateMany({
        where: { usuario_id: titularId, estado: 'pendiente' },
        data: {
          estado: 'atendida',
          respuesta: respuesta?.trim() || 'Tus datos fueron suprimidos.',
          atendida_en: ahora,
          atendida_por_id: actorId,
        },
      });
    });

    await this.storage.borrarPorUrl(titular?.foto_url); // 3
    return { suprimido: true, suprimido_en: ahora };
  }

  /** La solicitud existe (en este tenant) y sigue pendiente. */
  private async pendiente(tx: any, id: string) {
    const s = await tx.solicitudDatos.findFirst({ where: { id } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    if (s.estado !== 'pendiente') throw new ConflictException('Esa solicitud ya fue atendida');
    return s;
  }
}

/**
 * Suma días hábiles (lunes a viernes). Nota: no descuenta los festivos de
 * Colombia; como el plazo real sería IGUAL O MAYOR, la fecha que mostramos es
 * prudente (nunca promete más tiempo del que hay).
 */
export function sumarDiasHabiles(desde: Date, dias: number): Date {
  const d = new Date(desde);
  let sumados = 0;
  while (sumados < dias) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) sumados++;
  }
  return d;
}
