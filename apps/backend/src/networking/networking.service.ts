import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/**
 * Networking (Fase 6): interes mutuo entre asistentes -> match -> conexion.
 *
 * El interes es DIRECCIONAL. Cuando A marca interes en B y ya existia el de B en
 * A, hay match: ambos intereses pasan a 'correspondido' y se crea una Conexion
 * (con limite de mensajes). El chat vive en el modulo/endpoints de la Fase 6.3.
 */
@Injectable()
export class NetworkingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Exige que el usuario este inscrito (confirmado) en el congreso. */
  private async exigirInscrito(tx: any, congresoId: string, usuarioId: string) {
    const insc = await tx.inscripcion.findFirst({
      where: { congreso_id: congresoId, usuario_id: usuarioId, estado: 'confirmada' },
    });
    if (!insc) throw new ForbiddenException('Debes estar inscrito en el congreso');
  }

  /**
   * Directorio de networking de un congreso: los demas asistentes inscritos y mi
   * relacion con cada uno:
   *   'ninguno'       -> aun no hay interes
   *   'enviado'       -> yo le envie interes (pendiente)
   *   'recibido'      -> el me envio interes (pendiente) y yo no
   *   'correspondido' -> hay match (trae conexionId para chatear)
   */
  async directorio(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      await this.exigirInscrito(tx, congresoId, usuarioId);

      const inscritos = await tx.inscripcion.findMany({
        where: {
          congreso_id: congresoId,
          estado: 'confirmada',
          usuario_id: { not: usuarioId },
          // 8.7.c (Ley 1581): solo aparece quien tiene una autorización de
          // datos VIGENTE. Quien revocó (o nunca aceptó) no se muestra.
          usuario: { acepto_datos_en: { not: null } },
        },
        include: { usuario: { select: { id: true, nombre: true } } },
      });

      const emitidos = await tx.interesNetworking.findMany({
        where: { congreso_id: congresoId, emisor_id: usuarioId },
      });
      const recibidos = await tx.interesNetworking.findMany({
        where: { congreso_id: congresoId, receptor_id: usuarioId },
      });
      const conexiones = await tx.conexion.findMany({
        where: {
          interes: {
            congreso_id: congresoId,
            OR: [{ emisor_id: usuarioId }, { receptor_id: usuarioId }],
          },
        },
        include: { interes: { select: { emisor_id: true, receptor_id: true } } },
      });

      const emit = new Map(emitidos.map((i: any) => [i.receptor_id, i.estado]));
      const recib = new Map(recibidos.map((i: any) => [i.emisor_id, i.estado]));
      const conex = new Map<string, string>();
      for (const c of conexiones) {
        const otro =
          c.interes.emisor_id === usuarioId ? c.interes.receptor_id : c.interes.emisor_id;
        conex.set(otro, c.id);
      }

      return inscritos.map((ins: any) => {
        const u = ins.usuario;
        let estado = 'ninguno';
        let conexionId: string | null = null;
        if (conex.has(u.id)) {
          estado = 'correspondido';
          conexionId = conex.get(u.id)!;
        } else if (emit.get(u.id) === 'pendiente') {
          estado = 'enviado';
        } else if (recib.get(u.id) === 'pendiente') {
          estado = 'recibido';
        }
        return { usuario: u, estado, conexionId };
      });
    });
  }

  /**
   * Marca interes del usuario en `receptorId`. Si ya existia el interes reciproco,
   * hay match: ambos pasan a 'correspondido' y se crea (o reutiliza) la conexion.
   */
  async expresarInteres(
    orgId: string,
    usuarioId: string,
    congresoId: string,
    receptorId: string,
  ) {
    if (usuarioId === receptorId) {
      throw new BadRequestException('No puedes conectar contigo mismo');
    }
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      await this.exigirInscrito(tx, congresoId, usuarioId);

      const receptorInsc = await tx.inscripcion.findFirst({
        where: {
          congreso_id: congresoId,
          usuario_id: receptorId,
          estado: 'confirmada',
          // 8.7.c: solo con autorización · 8.7.d: y si no se ocultó del networking.
          usuario: { acepto_datos_en: { not: null }, visible_networking: true, suprimido_en: null },
        },
      });
      if (!receptorInsc) throw new NotFoundException('Ese asistente no esta en el congreso');

      // Mi interes (lo creo si no existe).
      let miInteres = await tx.interesNetworking.findFirst({
        where: { congreso_id: congresoId, emisor_id: usuarioId, receptor_id: receptorId },
      });
      if (!miInteres) {
        miInteres = await tx.interesNetworking.create({
          data: {
            organizacion_id: orgId,
            congreso_id: congresoId,
            emisor_id: usuarioId,
            receptor_id: receptorId,
          },
        });
      } else if (miInteres.estado === 'descartado') {
        // 8.7.d: lo había pasado ("Ahora no") y cambió de opinión.
        miInteres = await tx.interesNetworking.update({
          where: { id: miInteres.id },
          data: { estado: 'pendiente' },
        });
      }

      // ¿Existe el interes reciproco (el otro ya me habia marcado)?
      // 8.7.d: un "Ahora no" del otro NUNCA cuenta como interés.
      const reciproco = await tx.interesNetworking.findFirst({
        where: {
          congreso_id: congresoId,
          emisor_id: receptorId,
          receptor_id: usuarioId,
          estado: { not: 'descartado' },
        },
      });

      if (reciproco) {
        // MATCH: ambos correspondido + conexion (si no hay ya una para el par).
        await tx.interesNetworking.updateMany({
          where: { id: { in: [miInteres.id, reciproco.id] } },
          data: { estado: 'correspondido' },
        });
        let conexion = await tx.conexion.findFirst({
          where: { interes_id: { in: [miInteres.id, reciproco.id] } },
        });
        if (!conexion) {
          conexion = await tx.conexion.create({
            data: { organizacion_id: orgId, interes_id: miInteres.id },
          });
        }
        return { match: true, conexionId: conexion.id };
      }

      return { match: false };
    });
  }

  /** Mis conexiones (matches), con la otra persona y el conteo/limite de mensajes. */
  async misConexiones(orgId: string, usuarioId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const conexiones = await tx.conexion.findMany({
        where: {
          OR: [
            { interes: { emisor_id: usuarioId } },
            { interes: { receptor_id: usuarioId } },
          ],
        },
        include: {
          interes: {
            include: {
              // 8.7.d: con foto, para la lista de Conexiones.
              emisor: { select: { id: true, nombre: true, apellidos: true, foto_url: true, cargo: true } },
              receptor: { select: { id: true, nombre: true, apellidos: true, foto_url: true, cargo: true } },
            },
          },
          _count: { select: { mensajes: true } },
        },
        orderBy: { creado_en: 'desc' },
      });

      return conexiones.map((c: any) => {
        const otro =
          c.interes.emisor.id === usuarioId ? c.interes.receptor : c.interes.emisor;
        return {
          id: c.id,
          con: otro,
          limite_mensajes: c.limite_mensajes,
          mensajes: c._count.mensajes,
        };
      });
    });
  }
  /** Verifica que el usuario sea uno de los dos de la conexion; la devuelve. */
  private async conexionDelUsuario(tx: any, conexionId: string, usuarioId: string) {
    const conexion = await tx.conexion.findFirst({
      where: {
        id: conexionId,
        interes: { OR: [{ emisor_id: usuarioId }, { receptor_id: usuarioId }] },
      },
    });
    if (!conexion) throw new NotFoundException('Conexion no encontrada');
    return conexion;
  }

  /**
   * 8.7.j (decisión 34) — ELIMINAR UNA CONEXIÓN ("deshacer el match").
   * Solo una de las dos personas de la conexión puede hacerlo (para cualquier
   * otra, 404: ni siquiera se confirma que exista). Se borran, en una sola
   * transacción: el chat, la conexión y los "Me interesa" de AMBOS en ese
   * congreso. Resultado: las dos personas vuelven a aparecerse en Descubrir
   * como si nunca se hubieran visto (opción A). Y como el contacto solo se ve
   * con una conexión, deja de verse al instante (Ley 1581: control de la persona).
   */
  async eliminarConexion(orgId: string, usuarioId: string, conexionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const conexion = await this.conexionDelUsuario(tx, conexionId, usuarioId);
      const interes = await tx.interesNetworking.findFirst({ where: { id: conexion.interes_id } });
      if (!interes) throw new NotFoundException('Conexion no encontrada');
      const [a, b] = [interes.emisor_id, interes.receptor_id];

      // Orden: primero lo que depende (mensajes -> conexión -> intereses).
      await tx.mensajeChat.deleteMany({ where: { conexion_id: conexionId } });
      await tx.conexion.delete({ where: { id: conexionId } });
      await tx.interesNetworking.deleteMany({
        where: {
          congreso_id: interes.congreso_id,
          OR: [
            { emisor_id: a, receptor_id: b },
            { emisor_id: b, receptor_id: a },
          ],
        },
      });
      return { eliminada: true };
    });
  }

  /** Lista los mensajes de una conexion (solo sus dos integrantes). */
  async listarMensajes(orgId: string, usuarioId: string, conexionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const conexion = await this.conexionDelUsuario(tx, conexionId, usuarioId);
      const mensajes = await tx.mensajeChat.findMany({
        where: { conexion_id: conexionId },
        orderBy: { enviado_en: 'asc' },
        include: { autor: { select: { id: true, nombre: true } } },
      });
      return {
        limite_mensajes: conexion.limite_mensajes,
        usados: mensajes.length,
        mensajes,
      };
    });
  }

  /** Envia un mensaje respetando el limite de la conexion. */
  async enviarMensaje(
    orgId: string,
    usuarioId: string,
    conexionId: string,
    texto: string,
  ) {
    const mensaje = await this.prisma.runInTenant(orgId, async (tx) => {
      const conexion = await this.conexionDelUsuario(tx, conexionId, usuarioId);
      const usados = await tx.mensajeChat.count({ where: { conexion_id: conexionId } });
      if (usados >= conexion.limite_mensajes) {
        throw new BadRequestException('Se alcanzo el limite de mensajes de esta conexion');
      }
      return tx.mensajeChat.create({
        data: {
          organizacion_id: orgId,
          conexion_id: conexionId,
          autor_id: usuarioId,
          texto,
        },
        include: { autor: { select: { id: true, nombre: true } } },
      });
    });

    // Aviso en vivo a la sala de la conexion.
    this.realtime.mensajesCambiaron(conexionId);
    return mensaje;
  }

  // =======================================================================
  // 8.7.d — Networking "tipo Tinder"
  // =======================================================================

  /**
   * Las PERSONAS del networking de un congreso, cada una como "tarjeta" y con
   * mi relación con ella. La app arma con esto sus tres vistas:
   *   Descubrir  -> estado 'ninguno' o 'recibido' (primero los 'recibido':
   *                 ya les gusté, ¡más probabilidad de match!)
   *   Explorar   -> todas (con buscador y filtros)
   *   Conexiones -> 'correspondido'
   * Solo aparece quien: está inscrito (confirmado), autorizó sus datos (Ley
   * 1581), no se ocultó del networking y no fue suprimido.
   */
  async personas(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const congreso = await tx.congreso.findFirst({ where: { id: congresoId } });
      if (!congreso) throw new NotFoundException('Congreso no encontrado');
      await this.exigirInscrito(tx, congresoId, usuarioId);

      const inscritos = await tx.inscripcion.findMany({
        where: {
          congreso_id: congresoId,
          estado: 'confirmada',
          usuario_id: { not: usuarioId },
          usuario: { acepto_datos_en: { not: null }, visible_networking: true, suprimido_en: null },
        },
        select: { usuario: { select: SELECT_TARJETA } },
      });
      const ponentes = await this.ponentesPorCuenta(tx, congresoId);

      const intereses = await tx.interesNetworking.findMany({
        where: { congreso_id: congresoId, OR: [{ emisor_id: usuarioId }, { receptor_id: usuarioId }] },
        include: { conexion: { select: { id: true } } },
      });
      const mio = new Map<string, any>();
      const suyo = new Map<string, any>();
      for (const i of intereses) {
        if (i.emisor_id === usuarioId) mio.set(i.receptor_id, i);
        else suyo.set(i.emisor_id, i);
      }

      return inscritos.map(({ usuario: u }: any) => {
        const m = mio.get(u.id);
        const s = suyo.get(u.id);
        const conexionId = m?.conexion?.id ?? s?.conexion?.id ?? null;
        let estado = 'ninguno';
        if (conexionId || m?.estado === 'correspondido') estado = 'correspondido';
        else if (m?.estado === 'descartado') estado = 'descartado';
        else if (m?.estado === 'pendiente') estado = 'enviado';
        else if (s && s.estado === 'pendiente') estado = 'recibido';
        return { ...tarjeta(u, ponentes.get(u.id)), estado, conexionId };
      });
    });
  }

  /**
   * 8.7.d — Lo que DESBLOQUEA un match: el contacto de la otra persona, solo
   * si ella activó "Compartir mi contacto". Además, desde cuándo están
   * conectados y cuántos mensajes llevan.
   */
  async contactoDeConexion(orgId: string, usuarioId: string, conexionId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      const c = await this.conexionDelUsuario(tx, conexionId, usuarioId);
      const interes = await tx.interesNetworking.findFirst({ where: { id: c.interes_id } });
      const otroId = interes!.emisor_id === usuarioId ? interes!.receptor_id : interes!.emisor_id;
      const otro = await tx.usuario.findFirst({
        where: { id: otroId, suprimido_en: null },
        select: {
          compartir_contacto: true, compartir_telefono: true, compartir_correo: true, compartir_linkedin: true,
          telefono: true, contacto_email: true, linkedin_url: true, acepto_datos_en: true,
        },
      });
      const mensajes = await tx.mensajeChat.count({ where: { conexion_id: conexionId } });
      const base = { conectados_desde: c.creado_en, mensajes, limite_mensajes: c.limite_mensajes };
      // Sin autorización vigente o sin el interruptor: nada de contacto.
      if (!otro?.compartir_contacto || !otro.acepto_datos_en) return { ...base, compartido: false };
      // Consentimiento granular: un dato apagado ni siquiera sale del servidor.
      return {
        ...base,
        compartido: true,
        telefono: otro.compartir_telefono ? otro.telefono : null,
        correo: otro.compartir_correo ? otro.contacto_email : null,
        linkedin: otro.compartir_linkedin ? otro.linkedin_url : null,
      };
    });
  }

  /** Mi PROPIA tarjeta, tal como la ven los demás ("¿Cómo me ven?"). */
  async miTarjeta(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      await this.exigirInscrito(tx, congresoId, usuarioId);
      const u = await tx.usuario.findFirst({
        where: { id: usuarioId },
        select: { ...SELECT_TARJETA, visible_networking: true },
      });
      if (!u) throw new NotFoundException('Perfil no encontrado');
      const ponentes = await this.ponentesPorCuenta(tx, congresoId);
      return { ...tarjeta(u, ponentes.get(usuarioId)), visible_networking: u.visible_networking };
    });
  }

  /**
   * "Ahora no": no vuelve a salir en Descubrir. No se le avisa a nadie y se
   * puede deshacer (dándole "Me interesa" desde Explorar, o restableciendo).
   * Si ya hay match, no hace nada (un match no se "pasa").
   */
  async pasar(orgId: string, usuarioId: string, congresoId: string, receptorId: string) {
    if (usuarioId === receptorId) throw new BadRequestException('No puedes pasarte a ti mismo');
    return this.prisma.runInTenant(orgId, async (tx) => {
      await this.exigirInscrito(tx, congresoId, usuarioId);
      const actual = await tx.interesNetworking.findFirst({
        where: { congreso_id: congresoId, emisor_id: usuarioId, receptor_id: receptorId },
      });
      if (actual?.estado === 'correspondido') return { pasado: false, motivo: 'ya hay match' };
      if (actual) {
        await tx.interesNetworking.update({ where: { id: actual.id }, data: { estado: 'descartado' } });
      } else {
        const receptor = await tx.inscripcion.findFirst({
          where: { congreso_id: congresoId, usuario_id: receptorId, estado: 'confirmada' },
        });
        if (!receptor) throw new NotFoundException('Ese asistente no esta en el congreso');
        await tx.interesNetworking.create({
          data: {
            organizacion_id: orgId,
            congreso_id: congresoId,
            emisor_id: usuarioId,
            receptor_id: receptorId,
            estado: 'descartado',
          },
        });
      }
      return { pasado: true };
    });
  }

  /** "Volver a ver a los que pasé": borra mis "Ahora no" de este congreso. */
  async restablecerPasados(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      await this.exigirInscrito(tx, congresoId, usuarioId);
      const r = await tx.interesNetworking.deleteMany({
        where: { congreso_id: congresoId, emisor_id: usuarioId, estado: 'descartado' },
      });
      return { restablecidos: r.count };
    });
  }

  /**
   * TODOS los speakers del congreso (Explorar -> Ponentes), con sus charlas.
   * `usuario_id` dice si tienen cuenta (se puede conectar) o no ("Ver sus
   * charlas"). Lo público de un speaker (foto, bio, cargo) ya se ve en la
   * agenda, así que aquí no hay datos nuevos.
   */
  async ponentes(orgId: string, usuarioId: string, congresoId: string) {
    return this.prisma.runInTenant(orgId, async (tx) => {
      await this.exigirInscrito(tx, congresoId, usuarioId);
      const lista = await tx.ponente.findMany({
        where: { congreso_id: congresoId },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        include: { sesiones: { include: { sesion: SELECT_CHARLA } } },
      });
      return lista.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        foto_url: p.foto_url,
        cargo: p.cargo,
        empresa: p.empresa,
        pais: p.pais,
        pais_codigo: p.pais_codigo,
        bio: p.bio,
        usuario_id: p.usuario_id,
        charlas: charlasDe(p),
      }));
    });
  }

  /** usuario_id -> su ficha de ponente en este congreso (con charlas). */
  private async ponentesPorCuenta(tx: any, congresoId: string) {
    const fichas = await tx.ponente.findMany({
      where: { congreso_id: congresoId, usuario_id: { not: null } },
      include: { sesiones: { include: { sesion: SELECT_CHARLA } } },
    });
    return new Map<string, any>(fichas.map((p: any) => [p.usuario_id, p]));
  }
}

/** Lo que se lee de un usuario para su tarjeta (nunca documento ni teléfono). */
const SELECT_TARJETA = {
  id: true, nombre: true, apellidos: true, rol: true, foto_url: true,
  cargo: true, empresa: true, pais: true, pais_codigo: true,
  descripcion: true, anio_nacimiento: true,
} as const;

const SELECT_CHARLA = { select: { id: true, titulo: true, inicio: true, fin: true, tipo: true } } as const;

/** Las charlas de una ficha de ponente (sin los breaks), en orden. */
function charlasDe(p: any) {
  return (p?.sesiones ?? [])
    .map((sp: any) => sp.sesion)
    .filter((s: any) => s && s.tipo !== 'break')
    .sort((a: any, b: any) => +new Date(a.inicio) - +new Date(b.inicio))
    .map((s: any) => ({ id: s.id, titulo: s.titulo, inicio: s.inicio, fin: s.fin }));
}

/**
 * Arma la TARJETA pública de una persona.
 *  - La EDAD se calcula aquí: la app nunca recibe el año (lo que no sale del
 *    servidor, no se puede filtrar). Es aproximada (±1), suficiente.
 *  - La INSIGNIA: PONENTE si tiene ficha vinculada; si no, ORGANIZACIÓN o
 *    COORDINADOR según su rol; los asistentes, ninguna.
 */
function tarjeta(u: any, ficha?: any) {
  const edad = u.anio_nacimiento ? new Date().getFullYear() - u.anio_nacimiento : null;
  const insignia = ficha
    ? 'ponente'
    : u.rol === 'organizador' || u.rol === 'admin'
      ? 'organizacion'
      : u.rol === 'coordinador'
        ? 'coordinador'
        : null;
  return {
    id: u.id,
    nombre: [u.nombre, u.apellidos].filter(Boolean).join(' '),
    foto_url: u.foto_url ?? ficha?.foto_url ?? null,
    cargo: u.cargo ?? ficha?.cargo ?? null,
    empresa: u.empresa ?? ficha?.empresa ?? null,
    pais: u.pais ?? ficha?.pais ?? null,
    pais_codigo: u.pais_codigo ?? ficha?.pais_codigo ?? null,
    descripcion: u.descripcion ?? ficha?.bio ?? null,
    edad,
    insignia,
    charlas: ficha ? charlasDe(ficha) : [],
  };
}
