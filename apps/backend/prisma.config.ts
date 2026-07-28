// ==========================================================================
// Configuración de Prisma 7 — Nexvio
// Aquí vive la conexión que usan las MIGRACIONES (prisma migrate).
// Usa DIRECT_URL (puerto 5432, conexión directa) porque las migraciones
// necesitan una conexión sin pooler.
// El .env se carga a mano con "dotenv/config" (Prisma 7 ya no lo hace solo).
// ==========================================================================

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DIRECT_URL'],
  },
});
