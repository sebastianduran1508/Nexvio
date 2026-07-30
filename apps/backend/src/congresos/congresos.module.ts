import { Module } from '@nestjs/common';
import { CongresosController } from './congresos.controller';
import { CongresosService } from './congresos.service';

@Module({
  controllers: [CongresosController],
  providers: [CongresosService],
})
export class CongresosModule {}
