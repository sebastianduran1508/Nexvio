import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ActualizarPerfilDto, CAMPOS_EDITABLES, CAMPOS_NUMERICOS } from './dto/perfil.dto';

/** Lo que se muestra del propio perfil. */
const SELECT_PERFIL = {
  id: true, username: true, nombre: true, apellidos: true, rol: true,
  tipo_documento: true, numero_documento: true,
  cargo: true, empresa: true, telefono: true, pais: true, pais_codigo: true, foto_url: true,
  descripcion: true, anio_nacimiento: true, visible_networking: true,
  compartir_contacto: true, contacto_email: true, linkedin_url: true,
  compartir_telefono: true, compartir_correo: true, compartir_linkedin: true,
} as const;

/**
 * PERFIL PROPIO (Bloque 8.7.c). Todo opera sobre `usuarioId`, que sale del
 * token FIRMADO: nadie puede ver ni cambiar el perfil de otro por esta vía.
 */
@Injectable()
export class PerfilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async ver(orgId: string, usuarioId: string) {
    const u = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({ where: { id: usuarioId, suprimido_en: null }, select: SELECT_PERFIL }),
    );
    if (!u) throw new NotFoundException('Perfil no encontrado');
    return {
      ...u,
      // El documento completo no viaja: basta para reconocerlo (••••5678).
      numero_documento: enmascarar(u.numero_documento),
      editables: [...CAMPOS_EDITABLES, ...CAMPOS_NUMERICOS],
    };
  }

  async actualizar(orgId: string, usuarioId: string, dto: ActualizarPerfilDto) {
    // Solo los campos permitidos (el ValidationPipe ya rechaza los demás).
    const data: Record<string, string | number | null> = {};
    for (const campo of CAMPOS_EDITABLES) {
      const v = dto[campo];
      if (v === undefined) continue;
      const limpio = v.trim();
      data[campo] = limpio === '' ? null : campo === 'pais_codigo' ? limpio.toUpperCase() : limpio;
    }
    for (const campo of CAMPOS_NUMERICOS) {
      if (dto[campo] !== undefined) data[campo] = dto[campo] ?? null;
    }
    if (dto.visible_networking !== undefined) (data as any).visible_networking = dto.visible_networking;
    for (const k of ['compartir_contacto', 'compartir_telefono', 'compartir_correo', 'compartir_linkedin'] as const) {
      if (dto[k] !== undefined) (data as any)[k] = dto[k];
    }
    await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.updateMany({ where: { id: usuarioId, suprimido_en: null }, data: data as Prisma.UsuarioUpdateManyMutationInput }),
    );
    return this.ver(orgId, usuarioId);
  }

  /**
   * Foto de perfil. Mismo orden seguro que la de los ponentes (8.4.d):
   * subir FUERA de la transacción -> guardar la URL (si falla, se borra la
   * nueva) -> borrar la vieja. Así nunca queda el perfil apuntando a nada.
   */
  async subirFoto(orgId: string, usuarioId: string, archivo: Express.Multer.File) {
    const antes = await this.ver(orgId, usuarioId);
    const url = await this.storage.subirImagen(archivo, `${orgId}/usuarios`, usuarioId);
    try {
      await this.prisma.runInTenant(orgId, (tx) =>
        tx.usuario.updateMany({ where: { id: usuarioId }, data: { foto_url: url } }),
      );
    } catch (e) {
      await this.storage.borrarPorUrl(url);
      throw e;
    }
    await this.storage.borrarPorUrl(antes.foto_url);
    return this.ver(orgId, usuarioId);
  }

  async quitarFoto(orgId: string, usuarioId: string) {
    const antes = await this.ver(orgId, usuarioId);
    await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.updateMany({ where: { id: usuarioId }, data: { foto_url: null } }),
    );
    await this.storage.borrarPorUrl(antes.foto_url);
    return this.ver(orgId, usuarioId);
  }

  // ---------------------------------------------------------------------
  // Solicitudes del titular (Ley 1581). Hoy: supresión de datos.
  // ---------------------------------------------------------------------

  misSolicitudes(orgId: string, usuarioId: string) {
    return this.prisma.runInTenant(orgId, (tx) =>
      tx.solicitudDatos.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { creado_en: 'desc' },
        select: { id: true, tipo: true, motivo: true, estado: true, respuesta: true, creado_en: true, atendida_en: true },
      }),
    );
  }

  async pedirSupresion(orgId: string, usuarioId: string, motivo?: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const u = await tx.usuario.findFirst({
        where: { id: usuarioId, suprimido_en: null },
        select: { nombre: true, apellidos: true },
      });
      if (!u) throw new NotFoundException('Perfil no encontrado');
      const pendiente = await tx.solicitudDatos.findFirst({
        where: { usuario_id: usuarioId, tipo: 'supresion', estado: 'pendiente' },
      });
      if (pendiente) throw new ConflictException('Ya tienes una solicitud de supresión en trámite');
      return tx.solicitudDatos.create({
        data: {
          organizacion_id: orgId,
          usuario_id: usuarioId,
          titular_nombre: [u.nombre, u.apellidos].filter(Boolean).join(' '),
          tipo: 'supresion',
          motivo: motivo?.trim() || null,
        },
        select: { id: true, tipo: true, motivo: true, estado: true, creado_en: true },
      });
    });
  }
}

/** "1020304050" -> "••••4050". */
export function enmascarar(doc?: string | null) {
  if (!doc) return null;
  return doc.length <= 4 ? '••••' : `••••${doc.slice(-4)}`;
}
