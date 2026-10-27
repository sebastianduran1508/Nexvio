-- ==========================================================================
-- SUPABASE STORAGE — bucket público de imágenes (Bloque 8.4.d)
--
-- "nexvio-publico" guarda las imágenes que están HECHAS para mostrarse:
-- fotos de ponentes (8.4), logos de sponsors y del congreso (8.5).
-- AQUÍ NO VA NINGÚN DATO DE ASISTENTES.
--
--  - public = true            -> cualquiera con la URL puede VER la imagen
--                                (la app la muestra sin pedir permisos).
--  - file_size_limit = 2 MB   -> segundo cerrojo: aunque alguien se saltara
--  - allowed_mime_types          el backend, Supabase rechaza lo que no cumpla.
--
-- ¿Y quién puede SUBIR? Solo el backend, con la clave service_role (que se
-- salta las políticas). No creamos ninguna política de escritura, así que
-- desde el navegador o la app nadie puede subir ni borrar nada.
--
-- Cómo usarlo: Supabase -> SQL Editor -> pegar y ejecutar. Se puede correr
-- varias veces (si el bucket ya existe, solo actualiza su configuración).
-- ==========================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nexvio-publico',
  'nexvio-publico',
  true,
  2097152,                                        -- 2 MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verificación: debe salir una fila con public = true.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'nexvio-publico';
