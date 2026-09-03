# HANDOFF — Continuación de Nexvio en un nuevo equipo

> **Para retomar en el portátil:** abre un chat nuevo de Cowork, conecta la carpeta del proyecto y comparte este archivo. Con esto el asistente retoma exactamente donde quedamos.

## Qué es Nexvio (resumen)

Plataforma SaaS multi-tenant para gestión centralizada de congresos y eventos de Grupo Studio Sebia. Proyecto de grado (Universidad El Bosque) de Sebastián Durán Forero y María José Galindo Piñeros. Se compone de: app móvil (asistentes), panel web (staff) y backend/API.

Documentos de referencia en esta misma carpeta `docs/`:
- `NEXVIO_Vfinal.md` — la tesis aprobada.
- `diagramas.html` — diagramas C4, ERD y secuencia RLS (hechos por el autor).
- `PLAN_DE_RUTA_NEXVIO.md` — el plan de ruta completo (fases, decisiones, MVP vs mercado).

## Decisiones de arquitectura ya cerradas

- **Auth:** Supabase Auth (NO AWS Cognito).
- **Multi-tenancy:** RLS con esquema compartido y `organizacion_id` (NO separación por esquemas).
- **Base de datos:** PostgreSQL en Supabase + pgvector.
- **Caché/realtime:** Redis en Upstash.
- **IA/RAG:** OpenAI API + pgvector.
- **Mensajería MVP:** solo WhatsApp (Meta Cloud API); Instagram/Facebook para producto a mercado.
- **Infra:** servicios gestionados (nada de AWS EC2/RDS autogestionado).
- **Estructura:** monorepo con pnpm workspaces.

## Stack

TypeScript en todo. Backend: NestJS + Prisma. Web: Next.js 14 + React + TailwindCSS. Móvil: Expo (React Native). Realtime: Socket.io.

## Estructura del repositorio

```
nexvio/
├── apps/
│   ├── backend/   NestJS  ✅ creado y corriendo (Hello World en http://localhost:3000)
│   ├── web/       Next.js ⚠️ creado, pendiente terminar instalación y primer arranque
│   └── mobile/    Expo    ⛔ pendiente de crear
├── packages/
│   └── shared/    (aún vacío) tipos TS compartidos
├── docs/          documentos de tesis + este handoff
├── package.json
└── pnpm-workspace.yaml   (incluye onlyBuiltDependencies con los builds nativos autorizados)
```

## GitHub

- Repo: **https://github.com/sebastianduran1508/Nexvio**
- ⚠️ **Ojo con la cuenta:** hay una cuenta vieja `sduranfo` cuyas credenciales quedaron cacheadas y causaron un error 403. Usar SIEMPRE la cuenta **`sebastianduran1508`** (la dueña del repo). Si el push falla con "denied to sduranfo", borrar la credencial vieja en el Administrador de Credenciales de Windows (`git:https://github.com`) y volver a hacer login.

## Gotcha importante: pnpm 10/11 bloquea build scripts

pnpm bloquea por seguridad los scripts de compilación de dependencias nativas (`unrs-resolver`, `sharp`, `esbuild`, `@tailwindcss/oxide`, etc.) y **aborta la instalación** si no están autorizados. Ya están listados en `pnpm-workspace.yaml` bajo `onlyBuiltDependencies`. Si aparece un `ERR_PNPM_IGNORED_BUILDS` con una dependencia nueva, agregarla a esa lista o correr `pnpm approve-builds`.

## Estado actual (Fase 0 — Fundaciones) ✅ COMPLETA

- [x] Herramientas instaladas en el PC original: Node v24, pnpm 11, Git, VS Code.
- [x] Cuentas creadas: GitHub, Supabase, Upstash.
- [x] Monorepo inicializado y en GitHub.
- [x] Backend NestJS creado y corriendo (Hello World verificado) en localhost:3000.
- [x] Panel web Next.js verificado y corriendo en localhost:3001 (ver nota de puertos).
- [x] App móvil Expo (SDK 54) creada y corriendo en Expo Go.
- [x] Fase 0 cerrada y commiteada.

### Notas de Fase 0 (para no repetir dolores)
- **Puertos en local:** backend usa 3000 y web usa 3001 (`next dev -p 3001`) para no chocar. En la nube cada servicio tiene su propio host, así que esto es solo para desarrollo local.
- **Expo + pnpm:** Expo Go de la Play Store solo soporta hasta SDK 54, no SDK 57 → la app se creó con SDK 54. Además Metro no resuelve las dependencias symlinked de pnpm por defecto; se solucionó con `apps/mobile/metro.config.js` (watchFolders al monorepo, nodeModulesPaths y `unstable_enableSymlinks = true`). NO usar `disableHierarchicalLookup` con pnpm.
- **Pendiente menor (no urgente):** los archivos aparecen como "modificados" en git por diferencias de fin de línea (CRLF/LF) al mezclar Windows y otras herramientas. Conviene añadir un `.gitattributes` con `* text=auto eol=lf` y renormalizar en una sesión futura.

## Estado actual (Fase 1 — Base de datos y multi-tenancy con RLS) 🚧 NÚCLEO COMPLETO

Bloques cerrados con el **núcleo de 4 tablas** (Organizacion, Usuario, Congreso, Sesion):

- [x] **Backend conectado a Supabase con Prisma 7.** Proyecto Supabase creado; Prisma instalado en `apps/backend`; `.env` con `DATABASE_URL` (pooler 6543) y `DIRECT_URL` (direct 5432).
- [x] **ERD modelado** (núcleo) en `prisma/schema.prisma`. Nombres en snake_case para que coincidan con el SQL de RLS. Faltan las otras 12 entidades.
- [x] **Migrado a Supabase** — `20260728225838_init_nucleo`.
- [x] **RLS escrito y probado** — `20260728230346_rls_policies`. Prueba de aislamiento entre 2 organizaciones: pasa (cada tenant ve solo lo suyo; sin tenant = 0 filas / fail-closed).

### Decisiones y gotchas de Fase 1 (¡clave para no repetir dolores!)

- **Prisma 7, NO Prisma 6.** En Prisma 7 las URLs NO van en `schema.prisma`. Van en `prisma.config.ts` (migraciones, usa `DIRECT_URL`) y, en runtime, mediante un **driver adapter** (`@prisma/adapter-pg` + `pg`) que se pasa al `PrismaClient`. Requiere `dotenv` para que el config lea el `.env`.
- **pnpm bloqueó los build scripts de Prisma** (`ERR_PNPM_IGNORED_BUILDS`) pese a estar en `onlyBuiltDependencies`. Se resolvió con `pnpm approve-builds`.
- **⚠️ HALLAZGO CRÍTICO — el rol `postgres` se salta el RLS.** El usuario del connection string (`postgres`) tiene privilegios de admin y **bypassa RLS** (el SQL Editor de Supabase también). La app NUNCA debe conectarse como `postgres`. Se creó un rol dedicado **`nexvio_app`** (sin superuser ni bypassrls) — ver `apps/backend/prisma/setup/01_app_role.sql`. La contraseña de `nexvio_app` la tiene Sebastián (guardada aparte, no está en git). Las políticas RLS solo aplican a este rol.
- Prueba de aislamiento reproducible en `apps/backend/prisma/tests/rls_isolation_test.sql` (usa `SET ROLE nexvio_app` para validar dentro del SQL Editor).

## Estado actual (Fase 1b — Autenticación y autorización) ✅ COMPLETA

- [x] **Conexión de runtime como `nexvio_app`** (`DATABASE_URL`); migraciones siguen como `postgres` (`DIRECT_URL`).
- [x] **PrismaService con driver adapter** + `runInTenant` que hace `set_config('app.org_id', …)` por transacción. Contexto de tenant vía `AsyncLocalStorage` (`src/tenant/`).
- [x] **Supabase Auth** (firma ES256/JWKS) + **Custom Access Token Hook** (`custom_access_token_hook`, migración `auth_token_hook`) que inyecta `organizacion_id` y `rol` en el JWT.
- [x] **Guards NestJS**: `TenantContextMiddleware` (verifica JWT con `jose`+JWKS y fija el contexto, registrado en `main.ts`), `AuthGuard`, `RolesGuard` + `@Roles`.
- [x] **Módulo demo `congresos`** (`GET /congresos`) y **prueba e2e** (`prisma/tests/e2e_congresos.js`): sin token → 401; con token de Org A → solo datos de Org A. Pasa.

### Notas de Fase 1b
- Enlace: `usuario.id` == `sub` del JWT (el uid de Supabase Auth). Usuario de prueba: `test.medicina@nexvio.dev` (uid `f12cd771-…`), rol `organizador`, Org A (Medicina).
- `.env` nuevas: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. El backend carga `.env` con `import 'dotenv/config'` en `main.ts`.
- El hook es `SECURITY DEFINER` (corre como postgres) para poder leer `usuario` pese al RLS durante el login.

## Estado actual (Fase 3 — Módulo Congresos) ✅ COMPLETA

> Nota de numeración: el `PLAN_DE_RUTA_NEXVIO.md` tiene 10 fases (0–9). Lo que en
> sesiones previas se llamó "Fase 1b" es la **Fase 2 del plan** (Autenticación).
> Fases 0, 1, 2 y **3** ✅ completas.

- [x] **Tablas nuevas** `ponente` y `sesion_ponente` (relación M:N explícita entre
  sesiones y ponentes, según el ERD de la tesis). Migración `fase3_ponentes`.
- [x] **RLS** de ambas tablas (migración `rls_ponentes`; SQL de referencia en
  `prisma/setup/02_rls_ponentes.sql`). Los GRANTs los hereda `nexvio_app` vía los
  `default privileges` que ya dejó `01_app_role.sql` — no hubo que tocar nada.
- [x] **CRUD completo** en `src/congresos/` (tres pares controller/service:
  congresos, sesiones, ponentes + asignar/quitar ponentes de sesiones). Escribir
  requiere rol `admin`/`organizador`; leer, cualquier rol del tenant.
- [x] **Validación de entrada** con `class-validator` + `class-transformer` y
  `ValidationPipe` global en `main.ts` (DTOs en `src/congresos/dto/`). UUIDs de la
  URL validados con `ParseUUIDPipe`.
- [x] **Decorador `@OrgId()`** (`src/auth/org-id.decorator.ts`) para estampar el
  tenant al crear filas (lo exige el RLS `WITH CHECK`).
- [x] **Prueba de cierre e2e** `prisma/tests/e2e_fase3_crud.js`: crea congreso +
  2 sesiones + 1 ponente, asigna ponente a sesión, lee el detalle, valida el 400
  de un cuerpo malo y limpia con DELETE. **Pasa (todo verde).**

### Notas y gotchas de Fase 3

- **Flujo de la migración RLS:** las tablas las genera Prisma (`migrate dev`), pero
  el RLS no vive en el schema → migración `--create-only` (vacía) + pegar el SQL a
  mano. Mismo patrón de dos pasos que el núcleo.
- **⚠️ Gotcha de Windows:** si `start:dev` está corriendo, bloquea el cliente de
  Prisma y `migrate dev` NO lo regenera (falla en silencio). Síntoma: no compila con
  *"Property 'ponente' does not exist on type 'TransactionClient'"*. Solución:
  detener `start:dev` → `npx prisma generate` → arrancar de nuevo.
- **Aislamiento en el e2e:** el test acepta credenciales de una 2.ª organización
  (args 3 y 4) para probar el aislamiento entre tenants (Org B → 404). Se omite si
  no se dan. El aislamiento ya está probado a nivel BD en Fase 1
  (`rls_isolation_test.sql`).

## Estado actual (Bloque Puente — Alta de organizaciones) ✅ COMPLETO

Antes de la Fase 4 se hizo un bloque puente para tener **tenants y usuarios
reales** (hasta ahora se creaban a mano). Modelo elegido: **admin-provisioned**
(solo el admin global crea organizaciones) + alcance mínimo (organización + su
primer organizador). Diseñado para migrar a auto-registro sin reescribir.

- [x] **`SupabaseAdminService`** (`src/auth/supabase-admin.service.ts`) — usa la
  Admin API de Supabase (clave `service_role`) para crear/borrar cuentas de login.
- [x] **`OnboardingService`** (`src/onboarding/`) — pieza **reutilizable**: crea la
  cuenta de Auth, genera el UUID de la org y guarda organización + primer
  organizador en una transacción bajo RLS. Si el guardado falla, borra la cuenta de
  Auth (compensación, para no dejar huérfanos).
- [x] **`POST /organizaciones`** protegido con `@Roles('admin')`. (Para auto-registro
  futuro: añadir otro endpoint público que llame al mismo service.)
- [x] **Seed del admin global** `prisma/setup/03_seed_admin.js` — crea la cuenta y la
  fila `usuario` (org NULL, rol admin) por conexión directa `postgres` (el RLS no
  admite filas sin tenant). Se corre una vez.
- [x] **Prueba de cierre** `prisma/tests/e2e_onboarding_aislamiento.js`: el admin
  crea 2 orgs; un organizador NO puede crear orgs (403); y el congreso de la Org A
  es **invisible** para la Org B (404 + ausente en su lista). **Pasa (verde).**

### Decisiones y gotchas del bloque puente

- **`.env` nueva:** `SUPABASE_SERVICE_ROLE_KEY` (clave secreta `service_role`, de
  Supabase → Settings → API). SOLO backend, nunca frontend, no va a git.
- **⚠️ Reiniciar tras tocar `.env`:** un proceso `start:dev` ya en marcha NO relee
  el `.env`. Si falta una variable nueva, da 500 aunque esté en el archivo →
  reiniciar el backend.
- **Truco RLS sin bypass:** crear una org parece chocar con el RLS (no hay tenant
  aún), pero se genera el UUID de la org en código y se usa como `app.org_id`; así
  los INSERT de org y usuario pasan el `WITH CHECK` sin conexión privilegiada. Solo
  el seed del admin (fila con org NULL) necesita la conexión directa `postgres`.
- **Admin global:** `admin@nexvio.dev`, rol `admin`, `organizacion_id` NULL. Su
  token trae `rol: admin` y `organizacion_id` ausente (verificado con `get_token.js`).

## Estado actual (Rebanada vertical web) ✅ COMPLETA

Primer cable frontend↔backend, hecho pequeño a propósito para validar el wiring.

- [x] **Cliente Supabase en el navegador** (`apps/web/src/lib/supabase.ts`) +
  `apps/web/.env.local` con las claves públicas (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:3000`).
- [x] **Login** (`/login`) con `supabase.auth.signInWithPassword` y **lista de
  congresos** (`/congresos`) que llama a la API con `Authorization: Bearer <token>`.
  Raíz redirige a `/congresos`; sin sesión → `/login`.
- [x] **CORS habilitado** en el backend (`main.ts`, `enableCors` para el origen
  `http://localhost:3001`, configurable con `WEB_ORIGIN`).
- [x] **Prueba visual OK:** login como `test.medicina@nexvio.dev` → se ve solo
  "Congreso de Medicina" (RLS filtrando de punta a punta desde el navegador).

### Notas de la rebanada web
- **Dos terminales:** backend (`apps/backend` → `npm run start:dev`) y web
  (`apps/web` → `npm run dev`, en `localhost:3001`). Cada comando en SU carpeta.
- **Sesión del lado del navegador** (supabase-js + localStorage). Para producción se
  puede migrar a cookies con `@supabase/ssr` sin tocar la API.
- Dependencia nueva en el web: `@supabase/supabase-js`.

## Próximos pasos sugeridos — FASE 4

Con el cable frontend↔backend ya tendido, sigue la **Fase 4 — Inscripciones + app
móvil base** (tabla `Inscripcion` + app Expo donde el asistente se loguea y ve la
agenda; primer flujo completo desde el móvil). Pendientes menores arrastrados:
gestión de usuarios (ampliar el onboarding), la suite de Jest (`clearMocksOnScope`),
y ampliar el panel web (más pantallas) cuando toque la Fase 8.

**Al cerrar cada bloque: actualizar `docs/GUIA_DEV.md` (guía viva) y este HANDOFF.**

## Modo de trabajo acordado

Nivel: intermedio. El asistente da el paso a paso y el autor lo ejecuta. Ir en grupos grandes de trabajo pero detenerse si surge un problema. Cada fase cierra con una prueba. Commits frecuentes (Conventional Commits). Explicaciones amigables con ejemplos.

**Entendimiento del código (importante para Sebastián):** como el asistente escribe el código, Sebastián necesita ir entendiéndolo. Por eso: (1) en cada bloque el asistente explica qué hace el código nuevo y por qué; (2) se mantiene una **guía viva `docs/GUIA_DEV.md`** que se amplía al cerrar cada bloque (estructura de carpetas, qué hace cada archivo, flujo de una petición, decisiones clave). Al final del desarrollo debe existir una documentación detallada y fiel de cómo funciona la app y el código.
