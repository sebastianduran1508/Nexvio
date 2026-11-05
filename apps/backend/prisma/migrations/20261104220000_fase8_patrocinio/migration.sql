-- ==========================================================================
-- FASE 8 · Bloque 8.7.f — "Patrocinada por…"
-- Un sponsor (opcional) por charla. Si el sponsor se borra, la charla queda
-- sin patrocinio (ON DELETE SET NULL): nunca falla el borrado.
-- ==========================================================================

ALTER TABLE "sesion" ADD COLUMN "sponsor_id" UUID;
CREATE INDEX "sesion_sponsor_id_idx" ON "sesion"("sponsor_id");
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
