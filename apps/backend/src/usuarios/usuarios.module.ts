import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

/**
 * Modulo de gestion de usuarios (Fase 4). El staff da de alta asistentes.
 * Reutiliza el SupabaseAdminService (Admin API de Supabase Auth).
 */
@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, SupabaseAdminService],
})
export class UsuariosModule {}
