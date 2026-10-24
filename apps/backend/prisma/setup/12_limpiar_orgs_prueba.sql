-- ==========================================================================
-- LIMPIEZA — borra las organizaciones que dejó la prueba
-- e2e_onboarding_aislamiento.js ("Organización a 178...", "Organización b ...").
--
-- Se reconocen por el slug que les pone esa prueba: org-a-<número> / org-b-<número>.
--
-- Cómo usarlo: Supabase -> SQL Editor. Corre PRIMERO el paso 1 (solo mira) y,
-- si la lista es la esperada, corre el paso 2 completo.
-- Se ejecuta como `postgres` (dueño de las tablas), así que no le aplica el RLS.
-- ==========================================================================

-- PASO 1 — Vista previa: ¿qué se va a borrar?
SELECT o.nombre, o.slug,
       (SELECT COUNT(*) FROM congreso c WHERE c.organizacion_id = o.id) AS congresos,
       (SELECT COUNT(*) FROM usuario  u WHERE u.organizacion_id = o.id) AS usuarios
FROM organizacion o
WHERE o.slug ~ '^org-(a|b)-[0-9]+$'
ORDER BY o.nombre;


-- PASO 2 — Borrado (todo o nada: si algo falla, no se borra nada).
BEGIN;

CREATE TEMP TABLE orgs_basura ON COMMIT DROP AS
  SELECT id FROM organizacion WHERE slug ~ '^org-(a|b)-[0-9]+$';

-- Las cuentas de login de esas organizaciones (se borran al final).
CREATE TEMP TABLE auth_basura ON COMMIT DROP AS
  SELECT id FROM usuario WHERE organizacion_id IN (SELECT id FROM orgs_basura);

-- De las hojas hacia la raíz, para no chocar con las claves foráneas.
DELETE FROM mensaje_chat             WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM conexion                 WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM interes_networking       WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM respuesta_encuesta       WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM opcion_encuesta          WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM encuesta                 WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM pregunta                 WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM notificacion             WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM dispositivo_push         WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM sponsor                  WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM personalizacion_congreso WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM sesion_ponente           WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM inscripcion              WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM sesion                   WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM ponente                  WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM congreso                 WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM usuario                  WHERE organizacion_id IN (SELECT id FROM orgs_basura);
DELETE FROM organizacion             WHERE id IN (SELECT id FROM orgs_basura);

-- Y sus cuentas en Supabase Auth (usuario.id == auth.users.id).
DELETE FROM auth.users WHERE id IN (SELECT id FROM auth_basura);

COMMIT;
