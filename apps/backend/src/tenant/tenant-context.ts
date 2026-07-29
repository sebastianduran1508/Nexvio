import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de la petición: qué organización (tenant) y rol la originan.
 * Lo llena el guard/middleware a partir del JWT, y lo lee el PrismaService
 * para inyectar el organizacion_id en el RLS. Con AsyncLocalStorage, cada
 * petición tiene su propio "hilo" de contexto aislado, sin variables globales.
 */
export interface TenantContext {
  orgId: string;
  rol?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();
