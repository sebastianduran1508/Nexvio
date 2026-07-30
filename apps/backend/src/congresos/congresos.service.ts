import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CongresosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista los congresos del tenant activo.
   * Fíjate: NO hay `where organizacion_id`. runInTenant fija app.org_id (tomado
   * del AsyncLocalStorage, que viene del JWT) y el RLS filtra solo.
   */
  findAll() {
    return this.prisma.runInTenant(undefined, (tx) =>
      tx.congreso.findMany({
        select: { id: true, nombre: true, organizacion_id: true },
      }),
    );
  }
}
