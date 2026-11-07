import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from './supabase-admin.service';
import { POLITICA_DATOS_VERSION, politicaDatos } from '../legal/politica-datos';
import type { Idioma } from '../idioma/idioma';

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

  /**
   * Los datos del propio usuario autenticado (los usa la app al entrar).
   *
   * 8.7.a: `requiere_aceptar_datos` es la otra mitad del "portón" del primer
   * ingreso. Es true si nunca aceptó, o si aceptó una versión VIEJA de la
   * política (la cambiamos -> hay que volver a pedirla).
   */
  async yo(usuarioId: string, orgId: string | undefined) {
    const usuario = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({
        where: { id: usuarioId },
        select: {
          id: true, username: true, nombre: true, apellidos: true, rol: true,
          email: true, debe_cambiar_password: true, acepto_datos_en: true,
          politica_datos_version: true, organizacion_id: true,
          // 8.7.h: el panel muestra en la barra superior en qué organización estás.
          organizacion: { select: { nombre: true } },
        },
      }),
    );
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return {
      ...usuario,
      requiere_aceptar_datos:
        !usuario.acepto_datos_en ||
        usuario.politica_datos_version !== POLITICA_DATOS_VERSION,
    };
  }

  /**
   * La política vigente, con el nombre de la organización como responsable
   * (8.7.a). La app la muestra antes de pedir la aceptación.
   */
  async politica(orgId: string | undefined, idioma: Idioma = 'es') {
    // 8.7.c: con los DATOS LEGALES de la organización (responsable, contacto,
    // área que atiende), que exige el art. 13 del Decreto 1377.
    const org = orgId
      ? await this.prisma.runInTenant(orgId, (tx) =>
          tx.organizacion.findFirst({ where: { id: orgId } }),
        )
      : null;
    return politicaDatos(org ?? { nombre: 'Nexvio' }, idioma);
  }

  /**
   * Registra la autorización (Ley 1581): CUÁNDO y QUÉ versión.
   *
   * La app manda la versión que MOSTRÓ. Si no es la vigente (la política
   * cambió mientras la persona leía), se rechaza con 409: nadie puede quedar
   * "aceptando" un texto que no leyó.
   */
  async aceptarDatos(usuarioId: string, orgId: string | undefined, version: string) {
    if (version !== POLITICA_DATOS_VERSION) {
      throw new ConflictException(
        'La política de datos se actualizó. Vuelve a leerla antes de aceptar.',
      );
    }
    const ahora = new Date();
    await this.prisma.runInTenant(orgId, async (tx) => {
      await tx.usuario.updateMany({
        where: { id: usuarioId },
        data: { acepto_datos_en: ahora, politica_datos_version: version },
      });
      // 8.7.c: además, una fila en el HISTORIAL (la prueba completa).
      if (orgId) {
        await tx.consentimientoDatos.create({
          data: { organizacion_id: orgId, usuario_id: usuarioId, accion: 'acepta', version, creado_en: ahora },
        });
      }
    });
    return { aceptado: true, acepto_datos_en: ahora, version };
  }

  /**
   * REVOCAR la autorización (8.7.c; art. 8 de la Ley 1581).
   *
   * Revocar = "dejen de usar mis datos" (reversible). Efectos, en UNA
   * transacción:
   *  - acepto_datos_en y la versión vuelven a NULL -> /auth/yo pedirá aceptar
   *    de nuevo; mientras tanto la app no deja entrar.
   *  - desaparece del networking (el directorio solo muestra a quien autorizó).
   *  - sus teléfonos dejan de recibir avisos.
   *  - queda la fila 'revoca' en el historial.
   * La app, al recibir la respuesta, cierra la sesión.
   */
  async revocarDatos(usuarioId: string, orgId: string | undefined) {
    if (!orgId) throw new BadRequestException('Solo aplica a usuarios de una organización');
    const ahora = new Date();
    await this.prisma.runInTenant(orgId, async (tx) => {
      const u = await tx.usuario.findFirst({ where: { id: usuarioId }, select: { acepto_datos_en: true } });
      if (!u?.acepto_datos_en) throw new ConflictException('No tienes una autorización vigente');
      await tx.usuario.updateMany({
        where: { id: usuarioId },
        data: { acepto_datos_en: null, politica_datos_version: null },
      });
      await tx.dispositivoPush.updateMany({ where: { usuario_id: usuarioId }, data: { activo: false } });
      await tx.consentimientoDatos.create({
        data: { organizacion_id: orgId, usuario_id: usuarioId, accion: 'revoca', creado_en: ahora },
      });
    });
    return { revocado: true, revoco_en: ahora };
  }
}
