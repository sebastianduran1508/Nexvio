import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantStorage } from '../tenant/tenant-context';

/**
 * Cliente de Prisma para toda la app.
 *
 * - Se conecta como el rol `nexvio_app` (vía DATABASE_URL), que NO se salta
 *   el RLS: es el rol "esposado" por las políticas de aislamiento.
 * - Prisma 7 exige un driver adapter; usamos PrismaPg (sobre `pg`).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Ejecuta `fn` DENTRO de una transacción con el contexto de tenant fijado.
   *
   * Hace el equivalente a `SET LOCAL app.org_id = <orgId>` (con set_config,
   * que es parametrizable y evita inyección SQL). A partir de ahí, cualquier
   * consulta que corra `fn` queda filtrada por el RLS a esa organización.
   *
   * El orgId se puede pasar explícito o tomarse del AsyncLocalStorage
   * (que llenará el guard con el valor del JWT).
   *
   * Si no hay orgId => se fija '' => el RLS no devuelve nada (fail-closed).
   */
  async runInTenant<T>(
    orgId: string | undefined,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const org = orgId ?? tenantStorage.getStore()?.orgId ?? '';
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${org}, true)`;
      return fn(tx);
    });
  }
}
