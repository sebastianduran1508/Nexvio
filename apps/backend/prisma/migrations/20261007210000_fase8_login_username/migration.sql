-- ==========================================================================
-- FASE 8 · Bloque 8.3 — Login por usuario (JPGarcia) en vez de correo
--
-- Patron de dos pasos de siempre:
--   npx prisma migrate dev --create-only --name fase8_login_username
--   (pegar este SQL) -> npx prisma migrate dev
--
-- ---------------------------------------------------------------------------
-- EL PROBLEMA
-- ---------------------------------------------------------------------------
-- El asistente escribe "JPGarcia", pero Supabase Auth necesita un correo. Por
-- dentro cada cuenta tiene un correo sintetico (jpgarcia@amcper.nexvio.local)
-- que la persona nunca ve. Alguien tiene que traducir uno en otro ANTES del
-- login... y antes del login no hay token, asi que no hay tenant y el RLS
-- devuelve 0 filas (fail-closed, como debe ser).
--
-- Tercera ventanilla acotada, con los mismos candados que las dos del 8.2:
-- STABLE (solo lee), search_path fijo, REVOKE a PUBLIC y GRANT solo a
-- nexvio_app. Devuelve UNA columna: el correo. Ni el nombre, ni el rol, ni la
-- organizacion, ni si la cuenta existe de verdad mas alla de eso.
--
-- ---------------------------------------------------------------------------
-- NOTA DE SEGURIDAD (decision consciente, documentada para la sustentacion)
-- ---------------------------------------------------------------------------
-- Cualquier endpoint que traduzca usuario->correo permite, en teoria, probar
-- usuarios hasta adivinar cuales existen (enumeracion). Se asume porque:
--   1. El usuario (JPGarcia) no es un secreto: esta impreso en la escarapela.
--   2. Saberlo no acerca a nadie a entrar; la contrasena sigue siendo el muro.
--   3. La alternativa (que el asistente escriba el correo sintetico) anula
--      justo lo que pidio el cliente.
-- Mitigacion prevista para la Fase 9: limitar intentos por IP.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.nexvio_email_por_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM usuario u
  WHERE lower(u.username) = lower(trim(p_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.nexvio_email_por_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nexvio_email_por_username(text) TO nexvio_app;
