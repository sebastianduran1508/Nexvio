-- ==========================================================================
-- FASE 8 · Bloque 8.1 — Row Level Security de las tablas nuevas
--
-- Contenido de la migracion RLS. Mismo patron de dos pasos de siempre:
--   npx prisma migrate dev --create-only --name rls_fase8_modelo_datos
--   (pegar este SQL en el migration.sql recien creado) -> npx prisma migrate dev
--
-- Por cada tabla: ENABLE + FORCE + POLICY por organizacion_id (fail-closed).
-- Los GRANT no hacen falta: nexvio_app los hereda por los default privileges
-- que dejo 01_app_role.sql.
--
-- Las 5 tablas que ya existian (usuario, congreso, sesion, ponente,
-- inscripcion) solo recibieron COLUMNAS nuevas, y su politica ya cubre toda la
-- fila -> no hay que tocarlas.
-- ==========================================================================

-- ---------- SPONSOR ----------
ALTER TABLE "sponsor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sponsor" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "sponsor"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- PERSONALIZACION_CONGRESO ----------
ALTER TABLE "personalizacion_congreso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "personalizacion_congreso" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "personalizacion_congreso"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- DISPOSITIVO_PUSH ----------
ALTER TABLE "dispositivo_push" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispositivo_push" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "dispositivo_push"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- NOTIFICACION ----------
ALTER TABLE "notificacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notificacion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "notificacion"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
