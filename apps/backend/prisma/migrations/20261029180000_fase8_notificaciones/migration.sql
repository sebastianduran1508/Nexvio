-- ==========================================================================
-- FASE 8 · Bloque 8.6 — Notificaciones programadas
--
-- Se aplica con:  npx prisma migrate dev   (con el backend DETENIDO, por el
-- gotcha de Windows: start:dev bloquea el cliente de Prisma).
--
-- 1) Columna nueva: notificacion.programada_para (+ índice para buscarlas).
-- 2) CUARTA ventanilla SECURITY DEFINER: nexvio_notificaciones_vencidas().
--
-- ---------------------------------------------------------------------------
-- POR QUÉ HACE FALTA LA FUNCIÓN
-- ---------------------------------------------------------------------------
-- El "programador" del backend revisa cada minuto si hay avisos cuya hora ya
-- llegó. Esa revisión NO viene de ninguna petición: no hay token, no hay
-- tenant, y el RLS devuelve 0 filas (fail-closed, como debe ser).
--
-- La función devuelve SOLO dos columnas: el id del aviso y su organización.
-- Con eso el backend entra a CADA organización con runInTenant() y hace todo
-- lo demás (leer el aviso, buscar destinatarios, marcarlo enviado) pasando por
-- el RLS de siempre.
--
-- Mismos candados que las otras tres ventanillas:
--   STABLE (solo lee) · search_path fijo · REVOKE a PUBLIC · GRANT a nexvio_app.
-- ==========================================================================

ALTER TABLE "notificacion" ADD COLUMN "programada_para" TIMESTAMP(3);

CREATE INDEX "notificacion_estado_programada_para_idx"
  ON "notificacion"("estado", "programada_para");

-- programada_para se guarda en UTC (TIMESTAMP sin zona, como todo lo que
-- escribe Prisma), por eso se compara con la hora actual EN UTC.
CREATE OR REPLACE FUNCTION public.nexvio_notificaciones_vencidas()
RETURNS TABLE (id uuid, organizacion_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.organizacion_id
  FROM notificacion n
  WHERE n.estado = 'programada'
    AND n.programada_para <= (now() AT TIME ZONE 'UTC')
  ORDER BY n.programada_para
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.nexvio_notificaciones_vencidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nexvio_notificaciones_vencidas() TO nexvio_app;
