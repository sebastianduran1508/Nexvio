-- ==========================================================================
-- FASE 5 · Participacion en vivo — Row Level Security de las tablas nuevas
--
-- Contenido de la migracion RLS. Mismo patron de dos pasos:
--   npx prisma migrate dev --create-only --name rls_participacion
--   (pegar este SQL en su migration.sql)
--   npx prisma migrate dev
--
-- Por cada tabla: ENABLE + FORCE + POLICY por organizacion_id (fail-closed).
-- ==========================================================================

-- ---------- PREGUNTA ----------
ALTER TABLE "pregunta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pregunta" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "pregunta"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- ENCUESTA ----------
ALTER TABLE "encuesta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "encuesta" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "encuesta"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- OPCION_ENCUESTA ----------
ALTER TABLE "opcion_encuesta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opcion_encuesta" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "opcion_encuesta"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- RESPUESTA_ENCUESTA ----------
ALTER TABLE "respuesta_encuesta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "respuesta_encuesta" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "respuesta_encuesta"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
