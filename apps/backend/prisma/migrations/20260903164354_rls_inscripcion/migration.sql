-- FASE 4 · Modulo Inscripciones — Row Level Security de la tabla inscripcion.
-- Mismo patron que 20260728230346_rls_policies y rls_ponentes.
-- (Copia de referencia en prisma/setup/04_rls_inscripcion.sql.)

ALTER TABLE "inscripcion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inscripcion" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "inscripcion"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
