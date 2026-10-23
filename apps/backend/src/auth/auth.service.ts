import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from './supabase-admin.service';

/**
 * Las dos piezas de autenticación propias de Nexvio (Bloque 8.3).
 *
 * Todo lo demás del login lo hace Supabase Auth directamente contra el
 * navegador o la app; aquí solo están las dos cosas que Supabase no sabe
 * hacer por sí solo: traducir un usuario tipo JPGarcia a su correo interno, y
 * cerrar el ciclo de la contraseña temporal.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly admin: SupabaseAdminService,
  ) {}

  /**
   * usuario -> correo con el que hay que entrar.
   *
   * No usa runInTenant porque esto ocurre ANTES del login: no hay token y por
   * tanto no hay tenant. Va por la función acotada
   * `nexvio_email_por_username` (ver 10_funcion_login_username.sql).
   */
  async correoDeUsuario(username: string): Promise<string> {
    const limpio = (username ?? '').trim();
    if (!limpio) throw new BadRequestException('Falta el usuario');

    const filas = await this.prisma.$queryRaw<{ nexvio_email_por_username: string | null }[]>`
      SELECT nexvio_email_por_username(${limpio})
    `;
    const email = filas[0]?.nexvio_email_por_username;

    // Mensaje deliberadamente igual al de "contraseña incorrecta" que dará
    // Supabase después: así no se distingue "no existe" de "existe pero te
    // equivocaste", que es la pista que aprovecharía alguien probando usuarios.
    if (!email) throw new NotFoundException('Usuario o contraseña incorrectos');
    return email;
  }

  /**
   * Cambio de la contraseña temporal en el primer ingreso.
   *
   * Dos efectos en una sola operación: la contraseña nueva en Supabase Auth y
   * `debe_cambiar_password = false` en nuestra tabla. El orden importa: primero
   * Supabase (lo que puede fallar) y después la base; si lo hiciéramos al revés
   * y Supabase fallara, la persona quedaría con la contraseña vieja y sin que
   * el sistema volviera a pedirle el cambio.
   */
  async cambiarPassword(usuarioId: string, orgId: string | undefined, nueva: string) {
    if (!nueva || nueva.length < 8) {
      throw new BadRequestException(
        'La contraseña nueva debe tener al menos 8 caracteres',
      );
    }

    await this.admin.cambiarPassword(usuarioId, nueva);

    await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.updateMany({
        where: { id: usuarioId },
        data: { debe_cambiar_password: false },
      }),
    );

    return { cambiada: true };
  }

  /** Los datos del propio usuario autenticado (los usa la app al entrar). */
  async yo(usuarioId: string, orgId: string | undefined) {
    const usuario = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({
        where: { id: usuarioId },
        select: {
          id: true, username: true, nombre: true, apellidos: true, rol: true,
          email: true, debe_cambiar_password: true, acepto_datos_en: true,
          organizacion_id: true,
        },
      }),
    );
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }
}
