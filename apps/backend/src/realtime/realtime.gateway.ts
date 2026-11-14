import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { congresoDeRecuerdo, inscritoRecuerdo } from '../acceso/cache-acceso';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

/**
 * Gateway de Socket.io compartido (Fases 5 y 6).
 *
 * Auth en middleware (server.use), antes de dar por conectado al cliente, para
 * evitar la condicion de carrera. Salas:
 *  - sesion:<id>   -> participacion en vivo (preguntas/encuestas) [Fase 5]
 *  - conexion:<id> -> chat de una conexion de networking            [Fase 6]
 * En ambos casos se valida que el recurso sea del usuario antes de unirse.
 *
 * Patron "avisar y refrescar": se emiten avisos (no datos) y los clientes piden
 * la lista por REST.
 */
@WebSocketGateway({
  // 9.7: misma lista de orígenes que el CORS de main.ts (separados por coma).
  cors: { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3001').split(',').map((o) => o.trim()) },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private readonly prisma: PrismaService) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) throw new Error('sin token');
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `${process.env.SUPABASE_URL}/auth/v1`,
          audience: 'authenticated',
        });
        socket.data.user = {
          sub: payload.sub as string,
          orgId: payload.organizacion_id as string | undefined,
          rol: payload.rol as string | undefined,
        };
        next();
      } catch {
        next(new Error('no autorizado'));
      }
    });
  }

  /**
   * 9.13.b: cada conexión entra a su sala PERSONAL (`usuario:<id>`). Así un
   * aviso que solo le importa a una persona (p. ej. "tu pregunta cambió") le
   * llega solo a ella, y no a toda la charla.
   */
  handleConnection(client: Socket) {
    const sub = client.data.user?.sub;
    if (sub) client.join(`usuario:${sub}`);
  }

  // ---- Salas de SESION (Fase 5) ----
  @SubscribeMessage('join_sesion')
  async joinSesion(@ConnectedSocket() client: Socket, @MessageBody() sesionId: string) {
    const user = client.data.user;
    if (!user?.orgId) return { ok: false, error: 'no autorizado' };
    if (typeof sesionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sesionId)) {
      return { ok: false, error: 'sesion no encontrada' };
    }
    // 8.7.b: el asistente solo entra a la sala en vivo de una charla de SU
    // congreso (mismo criterio que AccesoCongresoGuard en las rutas HTTP).
    // 9.13.a: la misma memoria del portero HTTP (cache-acceso.ts). Si ya se
    // sabe que esta persona puede entrar a esta charla, no se va a la base.
    const esStaff = user.rol !== 'participante';
    const congresoRecordado = congresoDeRecuerdo.leer(`sesion:${sesionId}`);
    const yaSabido =
      !esStaff && congresoRecordado && inscritoRecuerdo.leer(`${user.sub}:${congresoRecordado}`);
    if (!yaSabido) {
      const puede = await this.prisma.runInTenant(user.orgId, async (tx) => {
        const s = await tx.sesion.findFirst({ where: { id: sesionId }, select: { congreso_id: true } });
        if (!s) return false;
        congresoDeRecuerdo.guardar(`sesion:${sesionId}`, s.congreso_id);
        if (esStaff) return true;
        const ins = await tx.inscripcion.findFirst({
          where: { congreso_id: s.congreso_id, usuario_id: user.sub, estado: 'confirmada' },
          select: { id: true },
        });
        if (ins) inscritoRecuerdo.guardar(`${user.sub}:${s.congreso_id}`, true);
        return !!ins;
      });
      if (!puede) return { ok: false, error: 'sesion no encontrada' };
    }
    client.join(`sesion:${sesionId}`);
    // 9.13.b: el staff entra además a la sala del staff de la charla (recibe
    // los avisos de TODAS las preguntas, que los asistentes ya no reciben).
    if (esStaff) client.join(`sesion:${sesionId}:staff`);
    return { ok: true };
  }

  @SubscribeMessage('leave_sesion')
  leaveSesion(@ConnectedSocket() client: Socket, @MessageBody() sesionId: string) {
    client.leave(`sesion:${sesionId}`);
    client.leave(`sesion:${sesionId}:staff`);
    return { ok: true };
  }

  // ---- Salas de CONEXION / chat (Fase 6) ----
  @SubscribeMessage('join_conexion')
  async joinConexion(@ConnectedSocket() client: Socket, @MessageBody() conexionId: string) {
    const user = client.data.user;
    if (!user?.orgId) return { ok: false, error: 'no autorizado' };
    // Solo los DOS de la conexion pueden unirse a su sala.
    const conexion = await this.prisma.runInTenant(user.orgId, (tx) =>
      tx.conexion.findFirst({
        where: {
          id: conexionId,
          interes: { OR: [{ emisor_id: user.sub }, { receptor_id: user.sub }] },
        },
      }),
    );
    if (!conexion) return { ok: false, error: 'no autorizado' };
    client.join(`conexion:${conexionId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave_conexion')
  leaveConexion(@ConnectedSocket() client: Socket, @MessageBody() conexionId: string) {
    client.leave(`conexion:${conexionId}`);
    return { ok: true };
  }

  // ---- Avisos que emiten los services ----
  /**
   * 9.13.b: las preguntas son PRIVADAS (decisión 39), así que el aviso va solo
   * a quien la hizo (`usuario:<autor>`) y al staff de la charla. Antes iba a
   * toda la sala y 700 teléfonos refrescaban una lista que no les cambiaba.
   */
  preguntasCambiaron(sesionId: string, autorId?: string) {
    const salas = [`sesion:${sesionId}:staff`];
    if (autorId) salas.push(`usuario:${autorId}`);
    this.server?.to(salas).emit('preguntas:cambio', { sesionId });
  }
  /**
   * 9.13.b: el aviso de encuestas puede traer los RESULTADOS adentro
   * (`encuestas`: las activas, sin el voto de nadie en particular). La app los
   * usa directamente y NO vuelve a pedirlos. Ver EncuestasService.avisar().
   */
  encuestasCambiaron(sesionId: string, encuestas?: unknown[]) {
    this.server?.to(`sesion:${sesionId}`).emit('encuestas:cambio', { sesionId, ...(encuestas ? { encuestas } : {}) });
  }
  mensajesCambiaron(conexionId: string) {
    this.server?.to(`conexion:${conexionId}`).emit('mensajes:cambio', { conexionId });
  }
}
