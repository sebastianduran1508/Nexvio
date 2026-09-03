import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CongresosModule } from './congresos/congresos.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ParticipacionModule } from './participacion/participacion.module';

@Module({
  imports: [PrismaModule, CongresosModule, OnboardingModule, InscripcionesModule, UsuariosModule, ParticipacionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
