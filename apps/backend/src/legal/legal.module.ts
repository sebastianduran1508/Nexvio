import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

/** Ley 1581 del lado del staff (8.7.c): datos legales y solicitudes. */
@Module({
  imports: [StorageModule],
  controllers: [LegalController],
  providers: [LegalService, SupabaseAdminService],
})
export class LegalModule {}
