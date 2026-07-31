import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

/**
 * Módulo de alta de organizaciones (bloque puente).
 * Provee el OnboardingService (reutilizable) y el SupabaseAdminService.
 */
@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, SupabaseAdminService],
})
export class OnboardingModule {}
