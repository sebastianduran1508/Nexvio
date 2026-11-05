-- ==========================================================================
-- FASE 8 · Bloque 8.7.f (ajuste) — VARIOS sponsors por charla
--
-- Antes: sesion.sponsor_id (uno solo). Ahora: tabla intermedia sesion_sponsor
-- (una fila por pareja charla–sponsor, con su orden). Lo que ya estaba
-- asignado se COPIA a la tabla nueva antes de borrar la columna vieja.
-- ==========================================================================

CREATE TABLE "sesion_sponsor" (
    "organizacion_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "sponsor_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sesion_sponsor_pkey" PRIMARY KEY ("sesion_id", "sponsor_id")
);
CREATE INDEX "sesion_sponsor_organizacion_id_idx" ON "sesion_sponsor"("organizacion_id");
CREATE INDEX "sesion_sponsor_sponsor_id_idx" ON "sesion_sponsor"("sponsor_id");
ALTER TABLE "sesion_sponsor" ADD CONSTRAINT "sesion_sponsor_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sesion_sponsor" ADD CONSTRAINT "sesion_sponsor_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sesion_sponsor" ADD CONSTRAINT "sesion_sponsor_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copiar lo que ya estaba asignado (ANTES de activar el RLS de la tabla nueva).
INSERT INTO "sesion_sponsor" ("organizacion_id", "sesion_id", "sponsor_id", "orden")
SELECT "organizacion_id", "id", "sponsor_id", 0 FROM "sesion" WHERE "sponsor_id" IS NOT NULL;

-- La columna vieja ya no hace falta.
ALTER TABLE "sesion" DROP CONSTRAINT "sesion_sponsor_id_fkey";
DROP INDEX "sesion_sponsor_id_idx";
ALTER TABLE "sesion" DROP COLUMN "sponsor_id";

-- RLS: aislamiento por organización (fail-closed).
ALTER TABLE "sesion_sponsor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesion_sponsor" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "sesion_sponsor"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
