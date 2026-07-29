-- ==========================================================================
-- FASE 1 · Bloque 4 — PRUEBA DE AISLAMIENTO MULTI-TENANT (RLS)
--
-- Objetivo: demostrar que una organización NO puede ver los datos de otra,
-- aunque ambas vivan en la misma tabla física.
--
-- IMPORTANTE — sobre el rol:
--   El SQL Editor se conecta como "postgres", que tiene privilegios de admin
--   y SE SALTA el RLS. Por eso, para probar de verdad, usamos SET ROLE nexvio_app
--   (el rol de aplicación sin bypass). RLS solo aplica a roles NO-admin.
--   Requisito: haber corrido antes prisma/setup/01_app_role.sql.
--
-- Cómo se ejecuta: corre cada PASO por separado (selecciona el bloque completo
-- del PASO y dale Run). Cada bloque es autónomo: incluye SET ROLE + contexto.
-- ==========================================================================


-- ============================ PASO 1 — SEMBRAR DATOS ============================
-- Se corre como postgres (admin), así los INSERT no chocan con el RLS.
-- Idempotente: se puede correr varias veces sin duplicar (ON CONFLICT DO NOTHING).

INSERT INTO organizacion (id, nombre, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Org A - Medicina', 'org-a'),
  ('22222222-2222-2222-2222-222222222222', 'Org B - Derecho',  'org-b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO congreso (id, organizacion_id, nombre, fecha_inicio, fecha_fin) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'Congreso de Medicina', '2026-03-01', '2026-03-03'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
   'Congreso de Derecho',  '2026-04-01', '2026-04-03')
ON CONFLICT (id) DO NOTHING;


-- ==================== PASO 2 — VER COMO ORG A ====================
-- Esperado: SOLO "Congreso de Medicina" (1 fila).
SET ROLE nexvio_app;
SET app.org_id = '11111111-1111-1111-1111-111111111111';
SELECT nombre, organizacion_id FROM congreso;


-- ==================== PASO 3 — VER COMO ORG B ====================
-- Esperado: SOLO "Congreso de Derecho" (1 fila).
SET ROLE nexvio_app;
SET app.org_id = '22222222-2222-2222-2222-222222222222';
SELECT nombre, organizacion_id FROM congreso;


-- ============= PASO 4 — SIN TENANT (fail-closed) =============
-- Esperado: 0 filas. Como nexvio_app y sin app.org_id => RLS no deja ver NADA.
SET ROLE nexvio_app;
SELECT count(*) AS filas_visibles FROM congreso;
