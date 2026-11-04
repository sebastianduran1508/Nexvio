-- ==========================================================================
-- FASE 8 · Bloque 8.7.d — Lo que desbloquea un match: el contacto
--
-- compartir_contacto: interruptor (apagado por defecto). Solo si está
--   encendido, las CONEXIONES (match) ven teléfono, correo de contacto y
--   LinkedIn. Nadie más. (La política sube a la v4 por esta finalidad nueva.)
-- contacto_email: el correo real para contactar (el de login puede ser
--   sintético, p. ej. jpgarcia@medicina.nexvio.local).
-- ==========================================================================

ALTER TABLE "usuario" ADD COLUMN "compartir_contacto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuario" ADD COLUMN "contacto_email" TEXT;
ALTER TABLE "usuario" ADD COLUMN "linkedin_url" TEXT;
