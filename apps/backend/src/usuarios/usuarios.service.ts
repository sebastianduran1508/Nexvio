import { ConflictException, Injectable } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';

/**
 * Gestion de usuarios del tenant (Fase 4). Permite al staff dar de alta
 * asistentes (participantes) para que puedan entrar a la app movil.
 *
 * Reutiliza el MISMO patron del alta de organizaciones:
 *   1) crear la cuenta de login en Supabase Auth (Admin API),
 *   2) guardar la fila `usuario` bajo RLS (organizacion_id = tenant activo),
 *   3) si el guardado falla, borrar la cuenta de Auth (compensacion) para no
 *      dejar cuentas huerfanas.
 */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SupabaseAdminService,
  ) {}

  /** Alta de un usuario (asistente por defecto) en la organizacion del staff. */
  async crear(orgId: string, dto: CrearUsuarioDto) {
    // 1) Cuenta de login. Si el correo ya existe, crearUsuario lanza 409.
    const authUserId = await this.auth.crearUsuario(dto.email, dto.password);

    try {
      // 2) Fila usuario, con el MISMO id (== sub del JWT) y bajo RLS del tenant.
      return await this.prisma.runInTenant(orgId, (tx) =>
        tx.usuario.create({
          data: {
            id: authUserId,
            organizacion_id: orgId,
            email: dto.email,
            nombre: dto.nombre,
            rol: (dto.rol ?? 'participante') as Rol,
          },
          select: { id: true, email: true, nombre: true, rol: true },
        }),
      );
    } catch (e: any) {
      // 3) Compensacion: deshacer la cuenta de Auth para no dejar huerfanos.
      await this.auth.borrarUsuario(authUserId).catch(() => undefined);
      if (e?.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw e;
    }
  }

  /** Lista los usuarios del tenant (para el panel de gestion del staff). */
  listar(orgId: string) {
    return this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findMany({
        orderBy: { creado_en: 'asc' },
        select: { id: true, email: true, nombre: true, rol: true, creado_en: true },
      }),
    );
  }
}
