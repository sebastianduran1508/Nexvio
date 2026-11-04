-- ==========================================================================
-- FASE 8 · Bloque 8.7.c (ajustes) — "Sobre mí" y edad en el perfil
--
-- descripcion: párrafo libre (máx. 500, lo valida el backend) para el networking.
-- anio_nacimiento: SOLO el año. Minimización (Ley 1581): para mostrar
--   "34 años" no hace falta guardar la fecha completa.
-- ==========================================================================

ALTER TABLE "usuario" ADD COLUMN "descripcion" TEXT;
ALTER TABLE "usuario" ADD COLUMN "anio_nacimiento" INTEGER;
