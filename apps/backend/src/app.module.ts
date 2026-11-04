import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CongresosModule } from './congresos/congresos.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ParticipacionModule } from './participacion/participacion.module';
import { NetworkingModule } from './networking/networking.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { AuthModule } from './auth/auth.module';
import { SponsorsModule } from './sponsors/sponsors.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AyudaModule } from './ayuda/ayuda.module';
import { PerfilModule } from './perfil/perfil.module';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [PrismaModule, CongresosModule, OnboardingModule, InscripcionesModule, UsuariosModule, ParticipacionModule, NetworkingModule, SuperadminModule, AuthModule, SponsorsModule, NotificacionesModule, AyudaModule, PerfilModule, LegalModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
