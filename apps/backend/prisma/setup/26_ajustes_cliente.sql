-- ==========================================================================
-- FASE 8 · Bloque 8.10 — Ajustes del cliente (reunión del 7-nov-2026)
--
-- Se corre UNA vez en el SQL Editor de Supabase (como los anteriores).
-- Es seguro correrlo dos veces: los reemplazos ya hechos no vuelven a cambiar.
--
--  1. Decisión 41 — nombres unificados con la app en los artículos de Ayuda:
--     Speakers -> Ponentes · Sponsors -> Patrocinadores ·
--     Usuarios (menú) -> Asistentes · "Nueva sesión" -> "Nueva charla".
--  2. Decisión 39 — la Ayuda ya no habla de "moderar" las preguntas; y dice
--     "notificaciones" como el menú del panel.
--  3. Decisión 41 — el Panorama del superadmin cuenta "charlas" sin los breaks
--     (igual que las tarjetas de congresos del panel).
-- ==========================================================================

-- 1 y 2) Ayuda. El ORDEN importa: primero lo más largo ("Speakers" antes que
-- "speaker"), para no dejar "Ponenteses".
UPDATE "articulo_ayuda" SET
  "titulo" = replace(replace(replace(replace("titulo",
      'Speakers', 'Ponentes'), 'speakers', 'ponentes'),
      'Sponsors', 'Patrocinadores'), 'sponsors', 'patrocinadores'),
  "contenido" =
    replace(replace(replace(replace(replace(replace(replace(replace(replace("contenido",
      'Speakers', 'Ponentes'),
      'speakers', 'ponentes'),
      'speaker', 'ponente'),
      'Sponsors', 'Patrocinadores'),
      'sponsors', 'patrocinadores'),
      '*Usuarios*', '*Asistentes*'),
      '**Nueva sesión**', '**Nueva charla**'),
      '**modera** las preguntas de cada charla', '**responde** las preguntas de cada charla (márcalas como respondidas; cada asistente solo ve las suyas)'),
      '**envía avisos** a los asistentes', '**envía notificaciones** a los asistentes'),
  "actualizado_en" = now()
WHERE "titulo" ~* 'speaker|sponsor'
   OR "contenido" ~* 'speaker|sponsor|\*Usuarios\*|Nueva sesión|\*\*modera\*\*|envía avisos\*\*';

-- 3) Panorama del superadmin: total_sesiones = charlas (sin breaks).
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
    (SELECT COUNT(*)::int FROM sesion s WHERE s.congreso_id = c.id AND s.tipo <> 'break'),
    (SELECT COUNT(*)::int FROM inscripcion i
      WHERE i.congreso_id = c.id AND i.estado = 'confirmada')
  FROM congreso c
  JOIN organizacion o ON o.id = c.organizacion_id
  ORDER BY en_curso DESC, c.fecha_inicio DESC;
$$;

REVOKE ALL ON FUNCTION public.nexvio_panorama_congresos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nexvio_panorama_congresos() TO nexvio_app;

-- Comprobación: debe devolver 0 filas.
SELECT "titulo" FROM "articulo_ayuda"
WHERE "titulo" ~* 'speaker|sponsor' OR "contenido" ~* 'speaker|sponsor|\*Usuarios\*|Nueva sesión';
