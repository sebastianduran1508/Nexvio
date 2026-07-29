-- ==========================================================================
-- FASE 1 · Bloque 4 — Row Level Security (aislamiento multi-tenant)
--
-- Para cada tabla del núcleo:
--   1) ENABLE  RLS  -> activa el filtrado por fila.
--   2) FORCE   RLS  -> lo aplica INCLUSO al dueño de la tabla (postgres),
--                      que es el rol con el que se conecta Prisma. Sin esto,
--                      el dueño se saltaría las políticas.
--   3) POLICY       -> la regla: solo ves/insertas filas de TU organización.
--
-- El tenant activo llega por la variable de sesión 'app.org_id', que el
-- backend fija con: SET LOCAL app.org_id = '<organizacion_id>'.
--
-- current_setting('app.org_id', true) -> devuelve NULL si nadie la fijó
-- NULLIF(..., '')                      -> trata '' como NULL (evita error de cast)
-- Resultado: sin tenant válido => 0 filas (fail-closed, denegar por defecto).
-- ==========================================================================

-- ---------- ORGANIZACION (la raíz: su clave de tenant es su propio id) ----------
ALTER TABLE "organizacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizacion" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "organizacion"
  USING (id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- USUARIO ----------
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "usuario"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- CONGRESO ----------
ALTER TABLE "congreso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "congreso" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "congreso"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- ---------- SESION ----------
ALTER TABLE "sesion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesion" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_aislamiento ON "sesion"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
