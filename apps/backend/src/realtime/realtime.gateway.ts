import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';

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
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' },
})
export class RealtimeGateway implements OnGatewayInit {
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

  // ---- Salas de SESION (Fase 5) ----
  @SubscribeMessage('join_sesion')
  async joinSesion(@ConnectedSocket() client: Socket, @MessageBody() sesionId: string) {
    const user = client.data.user;
    if (!user?.orgId) return { ok: false, error: 'no autorizado' };
    const sesion = await this.prisma.runInTenant(user.orgId, (tx) =>
      tx.sesion.findFirst({ where: { id: sesionId } }),
    );
    if (!sesion) return { ok: false, error: 'sesion no encontrada' };
    client.join(`sesion:${sesionId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave_sesion')
  leaveSesion(@ConnectedSocket() client: Socket, @MessageBody() sesionId: string) {
    client.leave(`sesion:${sesionId}`);
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
  preguntasCambiaron(sesionId: string) {
    this.server?.to(`sesion:${sesionId}`).emit('preguntas:cambio', { sesionId });
  }
  encuestasCambiaron(sesionId: string) {
    this.server?.to(`sesion:${sesionId}`).emit('encuestas:cambio', { sesionId });
  }
  mensajesCambiaron(conexionId: string) {
    this.server?.to(`conexion:${conexionId}`).emit('mensajes:cambio', { conexionId });
  }
}
