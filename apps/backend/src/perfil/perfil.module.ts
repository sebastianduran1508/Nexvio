import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

/** Perfil propio del usuario (8.7.c): datos, foto y solicitudes de datos. */
@Module({
  imports: [StorageModule],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}
