-- ==========================================================================
-- FASE 8 · Bloque 8.7.d — Contacto: consentimiento GRANULAR
--
-- Además del interruptor principal (compartir_contacto), cada dato tiene el
-- suyo. Encendidos por defecto: al activar el principal se comparten los tres,
-- y la persona apaga los que no quiera (decisión de Sebastián, 3-nov).
-- ==========================================================================

ALTER TABLE "usuario" ADD COLUMN "compartir_telefono" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuario" ADD COLUMN "compartir_correo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuario" ADD COLUMN "compartir_linkedin" BOOLEAN NOT NULL DEFAULT true;
