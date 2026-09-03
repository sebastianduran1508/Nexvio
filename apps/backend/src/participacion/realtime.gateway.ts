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

// Misma fuente de claves publicas (JWKS) que el middleware HTTP.
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

/**
 * Gateway de Socket.io para la participacion en vivo (Fase 5).
 *
 * Autenticacion: se hace en un MIDDLEWARE de Socket.io (server.use), que corre
 * ANTES de dar por establecida la conexion. Asi, cuando el cliente ya puede
 * mandar mensajes, su identidad (socket.data.user) SIEMPRE esta lista. (Si lo
 * hicieramos en handleConnection, que es asincrono, un join_sesion podria llegar
 * antes de terminar la verificacion -> condicion de carrera.)
 *
 * Salas: al unirse a la sala de una sesion, verificamos que sea del tenant del
 * usuario (via RLS). Se emiten "avisos" (no datos); las pantallas refrescan por
 * REST al oirlos.
 */
@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' },
})
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(private readonly prisma: PrismaService) {}

  /** Se ejecuta al iniciar el gateway: registramos el middleware de auth. */
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
        next(); // token valido -> se permite la conexion
      } catch {
        next(new Error('no autorizado')); // el cliente recibira connect_error
      }
    });
  }

  /** El cliente pide unirse a la sala de una sesion (para oir sus cambios). */
  @SubscribeMessage('join_sesion')
  async joinSesion(
    @ConnectedSocket() client: Socket,
    @MessageBody() sesionId: string,
  ) {
    const user = client.data.user;
    if (!user?.orgId) return { ok: false, error: 'no autorizado' };

    // La sesion debe ser del tenant del usuario (el RLS la oculta si no lo es).
    const sesion = await this.prisma.runInTenant(user.orgId, (tx) =>
      tx.sesion.findFirst({ where: { id: sesionId } }),
    );
    if (!sesion) return { ok: false, error: 'sesion no encontrada' };

    client.join(`sesion:${sesionId}`);
    return { ok: true };
  }

  /** El cliente sale de la sala (al salir de la pantalla de la sesion). */
  @SubscribeMessage('leave_sesion')
  leaveSesion(@ConnectedSocket() client: Socket, @MessageBody() sesionId: string) {
    client.leave(`sesion:${sesionId}`);
    return { ok: true };
  }

  // ----- Helpers que usan los services para avisar a la sala de una sesion -----

  preguntasCambiaron(sesionId: string) {
    this.server?.to(`sesion:${sesionId}`).emit('preguntas:cambio', { sesionId });
  }

  encuestasCambiaron(sesionId: string) {
    this.server?.to(`sesion:${sesionId}`).emit('encuestas:cambio', { sesionId });
  }
}
