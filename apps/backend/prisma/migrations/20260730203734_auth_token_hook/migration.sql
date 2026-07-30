-- ==========================================================================
-- FASE 1b — Custom Access Token Hook
--
-- Función que Supabase Auth ejecuta AL EMITIR cada JWT. Lee el organizacion_id
-- y el rol del usuario (de la tabla public.usuario) y los inyecta como claims
-- dentro del token. Así el JWT llega "cargado" y el backend no tiene que
-- consultar la BD en cada petición.
--
-- SECURITY DEFINER: la función corre con los privilegios de su dueño (postgres),
-- que se salta el RLS. Necesario para poder leer la fila del usuario aunque el
-- RLS esté activo (todavía no hay contexto de tenant en el momento del login).
-- set search_path: buena práctica de seguridad en funciones SECURITY DEFINER.
-- ==========================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  v_org  uuid;
  v_rol  text;
begin
  -- Buscar la identidad de negocio del usuario que está iniciando sesión
  select organizacion_id, rol::text
    into v_org, v_rol
  from public.usuario
  where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Inyectar los claims personalizados (si el usuario existe en nuestra tabla)
  if v_org is not null then
    claims := jsonb_set(claims, '{organizacion_id}', to_jsonb(v_org));
  end if;
  if v_rol is not null then
    claims := jsonb_set(claims, '{rol}', to_jsonb(v_rol));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Permisos: solo el rol interno de Auth puede ejecutar el hook.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
