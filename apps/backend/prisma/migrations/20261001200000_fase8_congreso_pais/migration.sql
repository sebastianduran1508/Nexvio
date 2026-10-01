-- Bloque 8.2 (ajuste) — pais del congreso.
-- Se guarda el nombre visible y el codigo ISO-3166 alpha-2 por separado:
-- el nombre es lo que se lee, el codigo es lo que el front usa para la bandera
-- (y asi dibujar una bandera no depende de como se escribio el nombre).
ALTER TABLE "congreso" ADD COLUMN "pais" TEXT;
ALTER TABLE "congreso" ADD COLUMN "pais_codigo" TEXT;
