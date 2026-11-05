-- ==========================================================================
-- FASE 8 · Bloque 8.7.e — Mi agenda (charlas favoritas)
--
-- Se aplica con (backend DETENIDO):
--   npx prisma migrate dev
--   npx prisma generate
-- ==========================================================================

CREATE TABLE "sesion_favorita" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_favorita_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sesion_favorita_usuario_id_sesion_id_key" ON "sesion_favorita"("usuario_id", "sesion_id");
CREATE INDEX "sesion_favorita_organizacion_id_idx" ON "sesion_favorita"("organizacion_id");
CREATE INDEX "sesion_favorita_sesion_id_idx" ON "sesion_favorita"("sesion_id");
ALTER TABLE "sesion_favorita" ADD CONSTRAINT "sesion_favorita_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sesion_favorita" ADD CONSTRAINT "sesion_favorita_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sesion_favorita" ADD CONSTRAINT "sesion_favorita_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: aislamiento por organización (fail-closed), como todo lo demás.
ALTER TABLE "sesion_favorita" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesion_favorita" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "sesion_favorita"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
