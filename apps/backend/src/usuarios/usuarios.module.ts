import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { AsistentesController } from './asistentes.controller';
import { AsistentesService } from './asistentes.service';
import { ImportacionService } from './importacion.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

/**
 * Modulo de gestion de usuarios.
 *  - UsuariosService  (Fase 4 / 8.2): alta de staff y asistentes sueltos.
 *  - AsistentesService (8.3): los inscritos a un congreso, con su perfil.
 *  - ImportacionService (8.3): el Excel que manda la organizacion.
 * Todos reutilizan el SupabaseAdminService (Admin API de Supabase Auth).
 */
@Module({
  controllers: [UsuariosController, AsistentesController],
  providers: [
    UsuariosService,
    AsistentesService,
    ImportacionService,
    SupabaseAdminService,
  ],
})
export class UsuariosModule {}
