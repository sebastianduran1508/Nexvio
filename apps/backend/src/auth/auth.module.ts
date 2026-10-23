import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAdminService } from './supabase-admin.service';

/** Rutas de autenticación propias (login por usuario y contraseña temporal). */
@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAdminService],
})
export class AuthModule {}
