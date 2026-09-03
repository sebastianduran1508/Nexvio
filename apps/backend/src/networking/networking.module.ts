import { Module } from '@nestjs/common';
import { NetworkingController } from './networking.controller';
import { NetworkingService } from './networking.service';
import { RealtimeModule } from '../realtime/realtime.module';

/** Modulo de networking (Fase 6): intereses, matches y (6.3) chat. */
@Module({
  imports: [RealtimeModule],
  controllers: [NetworkingController],
  providers: [NetworkingService],
})
export class NetworkingModule {}
