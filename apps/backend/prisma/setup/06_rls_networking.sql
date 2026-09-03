-- ==========================================================================
-- FASE 6 · Networking — Row Level Security de las tablas nuevas
--
-- Contenido de la migracion RLS. Mismo patron de dos pasos:
--   npx prisma migrate dev --create-only --name rls_networking
--   (pegar este SQL) -> npx prisma migrate dev
--
-- Por cada tabla: ENABLE + FORCE + POLICY por organizacion_id (fail-closed).
-- ==========================================================================

-- ---------- INTERES_NETWORKING ----------
ALTER TABLE "interes_networking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interes_networking" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "interes_networking"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- CONEXION ----------
ALTER TABLE "conexion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conexion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "conexion"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- MENSAJE_CHAT ----------
ALTER TABLE "mensaje_chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mensaje_chat" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "mensaje_chat"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
