-- ==========================================================================
-- FASE 1 — Rol de aplicación (setup de infraestructura, se corre UNA vez)
--
-- Por qué: el rol "postgres" tiene privilegios de admin y SE SALTA el RLS.
-- La app NUNCA debe conectarse como postgres. Creamos un rol dedicado
-- SIN bypassrls y SIN superuser: sobre él, las políticas RLS SÍ aplican.
--
-- Este archivo NO es una migración de Prisma (crea un rol con contraseña,
-- que no debe vivir versionado en git). Se ejecuta a mano en el SQL Editor.
-- Cambia la contraseña por una fuerte y guárdala en tu gestor.
-- ==========================================================================

-- 1) El rol de la aplicación (login + password, hereda nada extra)
create role nexvio_app with login password 'CAMBIA_ESTA_PASSWORD_FUERTE' noinherit;
-- Nota: por defecto NO es superuser y NO tiene bypassrls -> RLS lo controla.

-- 1b) Que postgres pueda "SET ROLE nexvio_app" (necesario para la prueba RLS)
grant nexvio_app to postgres;

-- 2) Permisos sobre el esquema y las tablas existentes
grant usage on schema public to nexvio_app;
grant select, insert, update, delete on all tables in schema public to nexvio_app;
grant usage, select on all sequences in schema public to nexvio_app;

-- 3) Permisos para tablas/secuencias FUTURAS (las que cree Prisma en las
--    próximas migraciones, que corren como "postgres")
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to nexvio_app;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to nexvio_app;
