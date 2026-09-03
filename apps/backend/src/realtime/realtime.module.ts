import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Modulo del gateway de Socket.io. Lo provee y EXPORTA para que cualquier modulo
 * (participacion, networking) pueda inyectar el gateway y emitir avisos.
 * (PrismaService es global, no hace falta importarlo aqui.)
 */
@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
