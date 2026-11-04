-- ==========================================================================
-- FASE 8 · Bloque 8.7.d — Networking tipo "Tinder"
--
-- 1) usuario.visible_networking: el interruptor "Aparecer en networking".
-- 2) ponente.usuario_id: la cuenta de la app de un speaker (opcional). Si está
--    vinculado, aparece en el networking con la insignia PONENTE.
-- 3) interes_networking.estado admite 'descartado' ("Ahora no"). Es texto
--    libre, así que no hace falta cambiar la columna; queda documentado.
-- ==========================================================================

ALTER TABLE "usuario" ADD COLUMN "visible_networking" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ponente" ADD COLUMN "usuario_id" UUID;
CREATE UNIQUE INDEX "ponente_congreso_id_usuario_id_key" ON "ponente"("congreso_id", "usuario_id");
ALTER TABLE "ponente" ADD CONSTRAINT "ponente_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
