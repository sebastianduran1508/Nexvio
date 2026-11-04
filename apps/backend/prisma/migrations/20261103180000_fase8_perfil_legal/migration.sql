-- ==========================================================================
-- FASE 8 · Bloque 8.7.c — Perfil y Ley 1581 (datos legales, historial de
-- autorizaciones, solicitudes de supresión)
--
-- Se aplica con (backend DETENIDO):
--   npx prisma migrate dev
--   npx prisma generate        <- Prisma 7 ya no lo hace solo
-- ==========================================================================

-- 1) Datos legales del RESPONSABLE (Decreto 1377, art. 13).
ALTER TABLE "organizacion"
  ADD COLUMN "legal_razon_social" TEXT,
  ADD COLUMN "legal_nit" TEXT,
  ADD COLUMN "legal_direccion" TEXT,
  ADD COLUMN "legal_ciudad" TEXT,
  ADD COLUMN "legal_correo" TEXT,
  ADD COLUMN "legal_telefono" TEXT,
  ADD COLUMN "legal_area" TEXT,
  ADD COLUMN "legal_url_politica" TEXT;

-- 2) Marca de "datos suprimidos" (la fila queda anonimizada).
ALTER TABLE "usuario" ADD COLUMN "suprimido_en" TIMESTAMP(3);

-- 3) Historial de autorizaciones (acepta / revoca).
CREATE TABLE "consentimiento_datos" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "usuario_id" UUID,
    "accion" TEXT NOT NULL,
    "version" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimiento_datos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consentimiento_datos_organizacion_id_idx" ON "consentimiento_datos"("organizacion_id");
CREATE INDEX "consentimiento_datos_usuario_id_idx" ON "consentimiento_datos"("usuario_id");
ALTER TABLE "consentimiento_datos" ADD CONSTRAINT "consentimiento_datos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consentimiento_datos" ADD CONSTRAINT "consentimiento_datos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Solicitudes del titular (supresión).
CREATE TABLE "solicitud_datos" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "usuario_id" UUID,
    "titular_nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'supresion',
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "respuesta" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendida_en" TIMESTAMP(3),
    "atendida_por_id" UUID,

    CONSTRAINT "solicitud_datos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "solicitud_datos_organizacion_id_idx" ON "solicitud_datos"("organizacion_id");
CREATE INDEX "solicitud_datos_usuario_id_idx" ON "solicitud_datos"("usuario_id");
CREATE INDEX "solicitud_datos_organizacion_id_estado_idx" ON "solicitud_datos"("organizacion_id", "estado");
ALTER TABLE "solicitud_datos" ADD CONSTRAINT "solicitud_datos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitud_datos" ADD CONSTRAINT "solicitud_datos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "solicitud_datos" ADD CONSTRAINT "solicitud_datos_atendida_por_id_fkey" FOREIGN KEY ("atendida_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) RLS: aislamiento por organización (igual que el resto, fail-closed).
ALTER TABLE "consentimiento_datos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consentimiento_datos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "consentimiento_datos"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "solicitud_datos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solicitud_datos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "solicitud_datos"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- Nota: las aceptaciones anteriores a este bloque NO se copian al historial.
-- No hace falta: la política sube a la versión 2 (ahora con los datos del
-- responsable, art. 13 del Decreto 1377) y todos la vuelven a aceptar al
-- entrar, lo que ya deja su fila aquí.
