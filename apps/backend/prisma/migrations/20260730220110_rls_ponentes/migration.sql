-- ==========================================================================
-- FASE 3 · Módulo Congresos — Row Level Security para las tablas nuevas
--
-- Este SQL es el CONTENIDO de la migración RLS de las tablas ponente y
-- sesion_ponente. Se genera una migración vacía con:
--   npx prisma migrate dev --create-only --name rls_ponentes
-- y se PEGA este contenido en su migration.sql, luego:
--   npx prisma migrate dev
--
-- Mismo patrón que 20260728230346_rls_policies (ver esa migración):
--   1) ENABLE RLS   -> activa el filtrado por fila.
--   2) FORCE  RLS   -> lo aplica incluso al dueño de la tabla.
--   3) POLICY       -> solo ves/insertas filas de TU organización.
--
-- Se conserva aquí una copia de referencia (este archivo no lo aplica Prisma;
-- lo aplica la migración donde lo pegues).
-- ==========================================================================

-- ---------- PONENTE ----------
ALTER TABLE "ponente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ponente" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "ponente"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- SESION_PONENTE (tabla intermedia M:N) ----------
ALTER TABLE "sesion_ponente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesion_ponente" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "sesion_ponente"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
