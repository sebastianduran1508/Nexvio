import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { CrearAsistenteDto, ActualizarAsistenteDto } from './dto/asistente.dto';
import {
  baseUsername,
  usernameLibre,
  correoSintetico,
  passwordTemporal,
  esCorreoSintetico,
} from './username.util';

/**
 * Una fila del listado de acceso: quién es, con qué usuario entra y —solo si
 * todavía no ha estrenado la cuenta— su contraseña temporal.
 */
export interface Credencial {
  nombres: string;
  apellidos: string;
  documento: string;
  username: string;
  /** Vacío cuando la persona ya puso su propia contraseña. */
  password_temporal: string;
  /** 'temporal' = hay que entregarle la clave · 'activa' = ya entró y la cambió. */
  estado?: 'temporal' | 'activa';
}

/** Lo que devuelve el alta: el asistente + sus credenciales de primer ingreso. */
export interface AsistenteCreado {
  id: string;
  nombres: string;
  apellidos: string;
  username: string;
  password_temporal: string;
}

/**
 * Gestión de los ASISTENTES de un congreso (Bloque 8.3).
 *
 * "Asistente" aquí = una fila en `usuario` con rol participante + su fila en
 * `inscripcion` a ESE congreso. Las dos cosas van siempre juntas, porque el
 * cliente no gestiona "personas sueltas": gestiona los inscritos a un evento.
 */
@Injectable()
export class AsistentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SupabaseAdminService,
  ) {}

  /** Los inscritos a un congreso, con su perfil y su tipo de suscripción. */
  async listar(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      // findFirst pasa por el RLS: si el congreso es de otro tenant -> null.
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      const inscripciones = await tx.inscripcion.findMany({
        where: { congreso_id: congresoId },
        orderBy: { registrado_en: 'desc' },
        include: {
          usuario: {
            select: {
              id: true, username: true, nombre: true, apellidos: true,
              email: true, tipo_documento: true, numero_documento: true,
              telefono: true, cargo: true, empresa: true, pais: true,
              pais_codigo: true, debe_cambiar_password: true, rol: true,
            },
          },
        },
      });

      // Aplanamos para que el panel no tenga que navegar objetos anidados.
      return inscripciones.map((i) => ({
        inscripcion_id: i.id,
        estado: i.estado,
        tipo_suscripcion: i.tipo_suscripcion,
        origen: i.origen,
        registrado_en: i.registrado_en,
        ...i.usuario,
      }));
    });
  }

  /**
   * Alta de UN asistente a mano.
   *
   * Pasos (el mismo patrón de compensación de las fases anteriores):
   *  1. Reservar un username libre dentro de la organización.
   *  2. Crear la cuenta de login en Supabase Auth.
   *  3. Guardar `usuario` + `inscripcion` en UNA transacción bajo RLS.
   *  4. Si el paso 3 falla, borrar la cuenta de Auth para no dejar huérfanos.
   */
  async crear(
    orgId: string,
    congresoId: string,
    dto: CrearAsistenteDto,
  ): Promise<AsistenteCreado> {
    const { organizacion, congreso, ocupados, documentos } =
      await this.cargarContexto(orgId, congresoId);

    if (documentos.has(dto.numero_documento.trim().toLowerCase())) {
      throw new ConflictException(
        'Ya existe una persona con ese documento en la organización',
      );
    }

    const username = usernameLibre(
      baseUsername(dto.nombres, dto.apellidos ?? ''),
      ocupados,
    );
    const email = dto.email?.trim() || correoSintetico(username, organizacion.slug);
    const password = passwordTemporal();

    const authUserId = await this.auth.crearUsuario(email, password);

    try {
      const creado = await this.prisma.runInTenant(orgId, async (tx) => {
        const usuario = await tx.usuario.create({
          data: this.datosUsuario(authUserId, orgId, username, email, dto),
          select: { id: true, nombre: true, apellidos: true, username: true },
        });

        await tx.inscripcion.create({
          data: {
            organizacion_id: orgId,
            congreso_id: congreso.id,
            usuario_id: usuario.id,
            tipo_suscripcion: dto.tipo_suscripcion ?? null,
            origen: 'manual',
          },
        });

        return usuario;
      });

      return {
        id: creado.id,
        nombres: creado.nombre,
        apellidos: creado.apellidos ?? '',
        username: creado.username!,
        password_temporal: password,
      };
    } catch (e: any) {
      await this.auth.borrarUsuario(authUserId).catch(() => undefined);
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un usuario con ese documento, usuario o correo',
        );
      }
      throw e;
    }
  }

  /** La ficha completa de un asistente (para el panel de detalle). */
  async obtener(orgId: string, usuarioId: string) {
    const usuario = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({
        where: { id: usuarioId },
        select: {
          id: true, username: true, nombre: true, apellidos: true, email: true,
          rol: true, tipo_documento: true, numero_documento: true,
          telefono: true, cargo: true, empresa: true, pais: true,
          pais_codigo: true, foto_url: true, debe_cambiar_password: true,
          acepto_datos_en: true, creado_en: true,
          inscripciones: {
            select: {
              id: true, estado: true, tipo_suscripcion: true, origen: true,
              registrado_en: true,
              congreso: { select: { id: true, nombre: true } },
            },
          },
        },
      }),
    );
    if (!usuario) throw new NotFoundException('Asistente no encontrado');

    return {
      ...usuario,
      // Le decimos al panel si el correo es de los que inventamos nosotros,
      // para que lo muestre como "sin correo" en vez de enseñar algo que la
      // persona no reconoce y que nadie debería escribir.
      email_sintetico: esCorreoSintetico(usuario.email),
    };
  }

  /**
   * Editar el perfil de un asistente.
   *
   * Lo delicado aquí es el CORREO: vive en dos sitios a la vez (nuestra tabla
   * y Supabase Auth, que es con lo que la persona inicia sesión). Se cambia
   * primero en Auth —que es lo que puede fallar por duplicado— y solo si eso
   * sale bien se guarda de nuestro lado. Al revés quedarían desincronizados y
   * la persona no podría entrar.
   */
  async actualizar(
    orgId: string,
    usuarioId: string,
    dto: ActualizarAsistenteDto,
  ) {
    const existe = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({
        where: { id: usuarioId },
        select: { id: true, email: true },
      }),
    );
    if (!existe) throw new NotFoundException('Asistente no encontrado');

    const correoNuevo = dto.email?.trim();
    const cambiaCorreo = !!correoNuevo && correoNuevo !== existe.email;

    if (cambiaCorreo) {
      await this.auth.cambiarEmail(usuarioId, correoNuevo!);
    }

    try {
      return await this.prisma.runInTenant(orgId, (tx) =>
        tx.usuario.update({
          where: { id: usuarioId },
          data: {
            ...(dto.nombres !== undefined ? { nombre: dto.nombres.trim() } : {}),
            ...(dto.apellidos !== undefined ? { apellidos: dto.apellidos.trim() } : {}),
            ...(dto.tipo_documento !== undefined
              ? { tipo_documento: dto.tipo_documento }
              : {}),
            ...(dto.numero_documento !== undefined
              ? { numero_documento: dto.numero_documento.trim() }
              : {}),
            ...(cambiaCorreo ? { email: correoNuevo } : {}),
            ...(dto.telefono !== undefined ? { telefono: dto.telefono } : {}),
            ...(dto.cargo !== undefined ? { cargo: dto.cargo } : {}),
            ...(dto.empresa !== undefined ? { empresa: dto.empresa } : {}),
            ...(dto.pais !== undefined ? { pais: dto.pais } : {}),
            ...(dto.pais_codigo !== undefined
              ? { pais_codigo: dto.pais_codigo.toUpperCase() }
              : {}),
          },
          select: {
            id: true, username: true, nombre: true, apellidos: true, email: true,
            tipo_documento: true, numero_documento: true, cargo: true,
            empresa: true, pais: true, pais_codigo: true, telefono: true,
          },
        }),
      );
    } catch (e: any) {
      // Compensación: si la base rechaza el cambio (p. ej. documento duplicado)
      // devolvemos el correo anterior a Auth para no dejarlos desincronizados.
      if (cambiaCorreo) {
        await this.auth.cambiarEmail(usuarioId, existe.email).catch(() => undefined);
      }
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe otra persona con ese documento en la organización',
        );
      }
      throw e;
    }
  }

  /**
   * Restablecer la contraseña de un asistente.
   *
   * Es lo que hace un admin cuando alguien pierde su acceso. Ojo con la idea
   * de "ver la contraseña": NO se puede. Supabase guarda solo un hash (una
   * huella de un solo sentido), así que nadie —ni el admin, ni nosotros, ni
   * Supabase— puede leer la original. Lo único posible es generar otra, que es
   * justo lo que hace este método.
   *
   * Vuelve a marcar `debe_cambiar_password`: la nueva es temporal otra vez.
   */
  async restablecerPassword(orgId: string, usuarioId: string) {
    const usuario = await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.findFirst({
        where: { id: usuarioId },
        select: { id: true, username: true, nombre: true, apellidos: true },
      }),
    );
    if (!usuario) throw new NotFoundException('Asistente no encontrado');

    const password = passwordTemporal();
    await this.auth.cambiarPassword(usuarioId, password);

    await this.prisma.runInTenant(orgId, (tx) =>
      tx.usuario.updateMany({
        where: { id: usuarioId },
        data: { debe_cambiar_password: true },
      }),
    );

    return {
      username: usuario.username,
      nombres: usuario.nombre,
      apellidos: usuario.apellidos ?? '',
      password_temporal: password,
    };
  }

  /**
   * El LISTADO DE ACCESO completo del congreso.
   *
   * Devuelve a TODOS los inscritos con su usuario, y la contraseña solo de
   * quienes aún no han estrenado la cuenta — a esos se les genera una nueva en
   * el momento, porque las anteriores no se pueden recuperar (en la base solo
   * hay un hash).
   *
   * El filtro `debe_cambiar_password` es la pieza crítica: a quien ya entró y
   * puso su propia contraseña NO se le toca nada. Aparece en el listado para
   * que el documento esté completo, pero con la marca "activa" en vez de una
   * clave. Regenerarle el acceso sin avisarle sería un desastre.
   *
   * Resuelve el caso real: los Excel llegan por tandas durante semanas y el
   * admin quiere, en cualquier momento, UN documento con todo el mundo.
   */
  async listadoDeAcceso(orgId: string, congresoId: string) {
    const datos = await this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({
        where: { id: congresoId },
        select: { id: true, nombre: true },
      });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      const inscripciones = await tx.inscripcion.findMany({
        where: { congreso_id: congresoId, usuario: { rol: 'participante' } },
        select: {
          usuario: {
            select: {
              id: true, username: true, nombre: true, apellidos: true,
              numero_documento: true, debe_cambiar_password: true,
            },
          },
        },
      });
      return { congreso, usuarios: inscripciones.map((i) => i.usuario) };
    });

    // Orden: primero los que necesitan credenciales, que es lo que el admin
    // tiene que repartir; después los que ya están andando.
    const ordenados = [...datos.usuarios].sort(
      (a, b) => Number(b.debe_cambiar_password) - Number(a.debe_cambiar_password),
    );

    const credenciales: Credencial[] = [];
    let regeneradas = 0;

    for (const u of ordenados) {
      const base = {
        nombres: u.nombre,
        apellidos: u.apellidos ?? '',
        documento: u.numero_documento ?? '',
        username: u.username ?? '',
      };

      if (!u.debe_cambiar_password) {
        credenciales.push({ ...base, password_temporal: '', estado: 'activa' });
        continue;
      }

      const password = passwordTemporal();
      try {
        await this.auth.cambiarPassword(u.id, password);
        credenciales.push({ ...base, password_temporal: password, estado: 'temporal' });
        regeneradas++;
      } catch {
        // Si una falla seguimos con el resto: mejor entregar 99 de 100 que
        // ninguna. La fallida se nota porque sale sin contraseña.
        credenciales.push({ ...base, password_temporal: '', estado: 'temporal' });
      }
    }

    return {
      congreso: datos.congreso.nombre,
      total: credenciales.length,
      regeneradas,
      ya_activas: credenciales.length - regeneradas,
      credenciales,
    };
  }

  /** Cambiar el tipo de suscripción de una inscripción concreta. */
  async actualizarSuscripcion(
    orgId: string,
    inscripcionId: string,
    tipo: string | null,
  ) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const existe = await tx.inscripcion.findFirst({ where: { id: inscripcionId } });
      if (!existe) throw new NotFoundException('Inscripción no encontrada');
      return tx.inscripcion.update({
        where: { id: inscripcionId },
        data: { tipo_suscripcion: tipo },
        select: { id: true, tipo_suscripcion: true },
      });
    });
  }

  /**
   * Quitar a alguien del congreso.
   *
   * Borra la INSCRIPCIÓN, no a la persona: puede estar inscrita a otros
   * congresos de la misma organización, y borrar su `usuario` arrastraría sus
   * preguntas, votos y chats. Si ya no queda en ningún congreso, el panel lo
   * avisa y el admin decide.
   */
  async quitarDelCongreso(orgId: string, inscripcionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const inscripcion = await tx.inscripcion.findFirst({
        where: { id: inscripcionId },
      });
      if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

      await tx.inscripcion.delete({ where: { id: inscripcionId } });

      const restantes = await tx.inscripcion.count({
        where: { usuario_id: inscripcion.usuario_id },
      });
      return { quitado: true, sin_congresos: restantes === 0 };
    });
  }

  // ---------------------------------------------------------------- helpers

  /**
   * Carga de una sola vez lo que necesita cualquier alta: la organización (por
   * su slug, para el correo sintético), el congreso, los usernames ya ocupados
   * y los documentos ya registrados.
   *
   * Es una sola consulta en vez de una por fila: con 300 filas del Excel, la
   * diferencia entre esto y consultar dentro del bucle es abismal.
   */
  async cargarContexto(orgId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const organizacion = await tx.organizacion.findFirst({
        where: { id: orgId },
        select: { id: true, slug: true, nombre: true },
      });
      if (!organizacion) throw new NotFoundException('Organización no encontrada');

      const congreso = await tx.congreso.findFirst({
        where: { id: congresoId },
        select: { id: true, nombre: true },
      });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');

      const usuarios = await tx.usuario.findMany({
        select: { id: true, username: true, numero_documento: true },
      });

      const ocupados = new Set(
        usuarios
          .map((u) => u.username?.toLowerCase())
          .filter((u): u is string => !!u),
      );
      const documentos = new Map(
        usuarios
          .filter((u) => u.numero_documento)
          .map((u) => [u.numero_documento!.trim().toLowerCase(), u.id]),
      );

      const inscritos = new Set(
        (
          await tx.inscripcion.findMany({
            where: { congreso_id: congresoId },
            select: { usuario_id: true },
          })
        ).map((i) => i.usuario_id),
      );

      return { organizacion, congreso, ocupados, documentos, inscritos };
    });
  }

  /** Los datos de la fila `usuario`, compartidos por el alta manual y la importación. */
  datosUsuario(
    authUserId: string,
    orgId: string,
    username: string,
    email: string,
    dto: CrearAsistenteDto,
  ): Prisma.UsuarioUncheckedCreateInput {
    return {
      id: authUserId, // == sub del JWT (convención de la Fase 2)
      organizacion_id: orgId,
      email,
      username,
      nombre: dto.nombres.trim(),
      apellidos: dto.apellidos?.trim() || null,
      rol: 'participante',
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento.trim(),
      telefono: dto.telefono ?? null,
      cargo: dto.cargo ?? null,
      empresa: dto.empresa ?? null,
      pais: dto.pais ?? null,
      pais_codigo: dto.pais_codigo?.toUpperCase() ?? null,
      // Entra con una contraseña temporal -> la app le exigirá cambiarla.
      debe_cambiar_password: true,
    };
  }
}
