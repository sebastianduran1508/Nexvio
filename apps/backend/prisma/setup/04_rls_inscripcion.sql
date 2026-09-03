-- ==========================================================================
-- FASE 4 · Modulo Inscripciones — Row Level Security para la tabla inscripcion
--
-- Este SQL es el CONTENIDO de la migracion RLS de la tabla inscripcion. Se
-- genera una migracion vacia con:
--   npx prisma migrate dev --create-only --name rls_inscripcion
-- y se PEGA este contenido en su migration.sql, luego:
--   npx prisma migrate dev
--
-- Mismo patron que 02_rls_ponentes.sql:
--   1) ENABLE RLS  -> activa el filtrado por fila.
--   2) FORCE  RLS  -> lo aplica incluso al dueno de la tabla.
--   3) POLICY      -> solo ves/insertas filas de TU organizacion.
--
-- Copia de referencia (este archivo no lo aplica Prisma; lo aplica la
-- migracion donde lo pegues).
-- ==========================================================================

ALTER TABLE "inscripcion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inscripcion" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "inscripcion"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
