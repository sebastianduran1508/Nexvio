-- ==========================================================================
-- FASE 8 · Bloque 8.7.a — Prueba de la autorización de datos (Ley 1581)
--
-- La Ley 1581 de 2012 (art. 9) y el Decreto 1377 de 2013 exigen que el
-- responsable pueda DEMOSTRAR la autorización. Ya guardábamos CUÁNDO aceptó
-- (acepto_datos_en, desde el 8.1); ahora también QUÉ versión del texto aceptó.
-- Si la política cambia, el backend sube la versión y la app vuelve a pedirla.
-- ==========================================================================

ALTER TABLE "usuario" ADD COLUMN "politica_datos_version" TEXT;
