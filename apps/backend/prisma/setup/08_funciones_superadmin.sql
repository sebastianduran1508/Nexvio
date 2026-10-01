-- ==========================================================================
-- FASE 8 · Bloque 8.2 — Las DOS ventanillas del superadmin
--
-- Contenido de la migracion. Patron de dos pasos de siempre:
--   npx prisma migrate dev --create-only --name fase8_funciones_superadmin
--   (pegar este SQL) -> npx prisma migrate dev
--
-- ---------------------------------------------------------------------------
-- POR QUE EXISTEN ESTAS FUNCIONES
-- ---------------------------------------------------------------------------
-- El superadmin (rol `admin`) no pertenece a ninguna organizacion, asi que el
-- RLS le devuelve 0 filas (fail-closed, funcionando como debe). Pero necesita:
--   1) la LISTA de organizaciones, para elegir en cual trabajar;
--   2) el PANORAMA de congresos de todos los clientes, que el cliente pidio.
-- Ambas cosas cruzan tenants por naturaleza.
--
-- En vez de abrir una politica de "superadmin ve todo" en CADA tabla (lo que
-- equivaldria a un interruptor que apaga el aislamiento), abrimos DOS
-- ventanillas: funciones SECURITY DEFINER, de SOLO LECTURA, con las columnas
-- contadas. Todo lo demas sigue pasando por el RLS sin excepcion.
--
-- SECURITY DEFINER = la funcion corre con los permisos de quien la creo
-- (postgres), no de quien la llama (nexvio_app). Es el mismo mecanismo que ya
-- usa `custom_access_token_hook` de la Fase 2 para poder leer `usuario`
-- durante el login pese al RLS.
--
-- Candados aplicados a cada funcion:
--   - STABLE                -> no puede escribir, solo leer.
--   - SET search_path       -> evita que alguien la enganie cambiando el path.
--   - REVOKE ALL FROM PUBLIC-> nadie puede ejecutarla por defecto.
--   - GRANT EXECUTE a nexvio_app -> solo el rol de la app, y el backend solo la
--     llama desde endpoints marcados con @Roles('admin').
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- VENTANILLA 1 — Lista de organizaciones (para el selector del panel)
-- Devuelve SOLO identificacion y conteo. Ni un dato de negocio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nexvio_listar_organizaciones()
RETURNS TABLE (
  id              uuid,
  nombre          text,
  slug            text,
  estado          text,
  creado_en       timestamptz,
  total_congresos int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.nombre,
    o.slug,
    o.estado,
    o.creado_en::timestamptz,
    (SELECT COUNT(*)::int FROM congreso c WHERE c.organizacion_id = o.id)
  FROM organizacion o
  ORDER BY o.nombre;
$$;

REVOKE ALL ON FUNCTION public.nexvio_listar_organizaciones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nexvio_listar_organizaciones() TO nexvio_app;

-- ---------------------------------------------------------------------------
-- VENTANILLA 2 — Panorama de congresos de TODOS los clientes
-- Resumen de solo lectura: quien, que, cuando y cuanta gente. Para VER.
-- Si el superadmin quiere ENTRAR a trabajar en uno, el panel lo mete en ese
-- tenant (cabecera X-Organizacion-Id) y a partir de ahi manda el RLS normal.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nexvio_panorama_congresos()
RETURNS TABLE (
  organizacion_id uuid,
  organizacion    text,
  congreso_id     uuid,
  congreso        text,
  fecha_inicio    date,
  fecha_fin       date,
  estado          text,
  ciudad          text,
  en_curso        boolean,
  total_sesiones  int,
  total_inscritos int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.nombre,
    c.id,
    c.nombre,
    c.fecha_inicio,
    c.fecha_fin,
    c.estado,
    c.ciudad,
    (CURRENT_DATE BETWEEN c.fecha_inicio AND c.fecha_fin) AS en_curso,
    (SELECT COUNT(*)::int FROM sesion s WHERE s.congreso_id = c.id),
    (SELECT COUNT(*)::int FROM inscripcion i
      WHERE i.congreso_id = c.id AND i.estado = 'confirmada')
  FROM congreso c
  JOIN organizacion o ON o.id = c.organizacion_id
  ORDER BY en_curso DESC, c.fecha_inicio DESC;
$$;

REVOKE ALL ON FUNCTION public.nexvio_panorama_congresos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nexvio_panorama_congresos() TO nexvio_app;
