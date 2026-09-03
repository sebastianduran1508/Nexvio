import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CongresosModule } from './congresos/congresos.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';

@Module({
  imports: [PrismaModule, CongresosModule, OnboardingModule, InscripcionesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
