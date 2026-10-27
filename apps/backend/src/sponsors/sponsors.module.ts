import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';

/** Sponsors de cada congreso (Bloque 8.5). Usa Storage para los logos. */
@Module({
  imports: [StorageModule],
  controllers: [SponsorsController],
  providers: [SponsorsService],
})
export class SponsorsModule {}
