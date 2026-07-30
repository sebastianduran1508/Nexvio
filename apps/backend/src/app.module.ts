import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CongresosModule } from './congresos/congresos.module';

@Module({
  imports: [PrismaModule, CongresosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
