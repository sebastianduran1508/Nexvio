# HANDOFF — Continuación de Nexvio en un nuevo equipo

> **Para retomar en el portátil:** abre un chat nuevo de Cowork, conecta la carpeta del proyecto y comparte este archivo. Con esto el asistente retoma exactamente donde quedamos.

## Qué es Nexvio (resumen)

Plataforma SaaS multi-tenant para gestión centralizada de congresos y eventos de Grupo Studio Sebia. Proyecto de grado (Universidad El Bosque) de Sebastián Durán Forero y María José Galindo Piñeros. Se compone de: app móvil (asistentes), panel web (staff) y backend/API.

> **Estado (12-nov-2026):** Fases 0–6 y **Fase 8 completa** (8.0–8.10).
> Faltan Fase 9 (carga, seguridad y despliegue) y Fase 7 (WhatsApp + IA). Para retomar el desarrollo: ir al **📍 PUNTO DE RETOMA**
> más reciente (casi al final). Para escribir la documentación de la tesis:
> empezar por `RESUMEN_PARA_DOCUMENTACION.md`.

Documentos de referencia en esta misma carpeta `docs/`:
- `RESUMEN_PARA_DOCUMENTACION.md` — **el punto de partida para la tesis:**
  arquitectura, decisiones con su porqué, qué se construyó en cada fase,
  pruebas y diferencias con el diseño original, con enlaces a este archivo y a
  la GUIA.
- `GUIA_DEV.md` — cómo funciona el código, sección por sección.
- `PRUEBAS_NEXVIO.md` — **todo sobre las pruebas**: estrategia, las 29 e2e,
  aislamiento, manuales, carga (escenarios, resultados y hallazgos),
  correcciones y decisiones.
- `NEXVIO_Vfinal.md` — la tesis aprobada.
- `diagramas.html` — diagramas C4, ERD y secuencia RLS (hechos por el autor;
  ⚠️ el ERD y el C4 están desactualizados: ver pendientes).
- `PLAN_DE_RUTA_NEXVIO.md` — el plan de ruta original (fases, decisiones, MVP
  vs mercado).
- `IDENTIDAD_VISUAL.md` — la marca (colores, tipografía, logo).

**Cómo leer este archivo:** es una **bitácora** en orden cronológico. Cada fase
o bloque tiene su "Estado actual" con lo construido, sus decisiones y sus
*gotchas*. Desde el 8.7 las decisiones están **numeradas** (1 a 41). Los
"PUNTO DE RETOMA" marcados como *(Histórico)* son traspasos viejos entre
chats; se conservan como registro.

## Decisiones de arquitectura (con su porqué y cómo quedaron)

| Tema | Decisión | Por qué | Cómo quedó (nov-2026) |
|---|---|---|---|
| Autenticación | **Supabase Auth** (no AWS Cognito, como decía la tesis) | Gratis, emite JWT con *claims* propios (rol y organización) vía un hook, integrado con la base. Cognito eran días de configuración sin valor para la tesis. | ✅ Usado. Login por correo (staff) y por **usuario** (asistentes, con correo sintético, 8.3). |
| Multi-tenancy | **RLS con esquema compartido** y `organizacion_id` (no un esquema por cliente) | Aislamiento en el motor de la base: aunque el código olvide un filtro, la base no devuelve filas de otro cliente. Para 2 desarrolladores es mucho más simple que mantener N esquemas y N migraciones. | ✅ En todas las tablas de negocio, probado con pruebas de aislamiento. Superadmin por **suplantación** (8.2), sin apagar el RLS. |
| Base de datos | **PostgreSQL en Supabase** (+ pgvector para la IA) | Gestionada, con RLS, Auth y Storage en el mismo servicio. | ✅ 23 tablas. pgvector: con la Fase 7. |
| Caché / realtime | **Redis en Upstash** + **Socket.io** | Redis para sesiones, límites y *pub/sub* de Socket.io entre instancias. | ⚠️ Socket.io ✅; **Redis no se usó**: con una sola instancia del backend no hace falta. Se necesitará al escalar (adaptador Redis). |
| Archivos | **Supabase Storage** (no AWS S3) | Ya incluido en Supabase; en la base solo va la URL. | ✅ Fotos de ponentes y perfiles, logos, portadas (8.4–8.7). |
| Notificaciones | **Expo Push** | Un solo servicio para Android e iOS. | ✅ Envío y bandeja "Avisos"; la prueba en teléfono real es el 8.9. |
| IA / RAG | **OpenAI API + pgvector** | Embeddings dentro de la misma base. | ⏳ Fase 7. |
| Mensajería (MVP) | **Solo WhatsApp** (Meta Cloud API) | Instagram y Facebook tienen aprobación lenta: quedan para "producto a mercado". | ⏳ Fase 7. |
| Infraestructura | **Servicios gestionados** (Supabase + Railway/Render), no AWS EC2/RDS/ElastiCache | Más barato y sin trabajo de servidores que no aporta a la tesis. | ✅ Desarrollo en planes gratuitos; despliegue: Fase 9. |
| Código | **Monorepo** con pnpm workspaces, TypeScript en todo | Un solo repositorio e historial para las tres apps. | ✅ (`packages/shared` no se llegó a usar: cada app tiene sus tipos). |
| Idiomas | App en **es / en / pt-BR**; panel solo en español | Congresos internacionales (decisión 35). | ✅ 8.8. |

## Stack

TypeScript en todo. **Backend:** NestJS 11 + Prisma 7 (adapter-pg) + Socket.io 4
+ exceljs. **Web:** Next.js 16 + React 19 + Tailwind 4 (componentes estilo
shadcn). **Móvil:** Expo SDK 54 (React Native 0.81) + NativeWind 4 + i18next.
**Servicios:** Supabase (PostgreSQL, Auth, Storage) y Expo Push. Detalle y
porqué de cada pieza: GUIA § 2.

## Estructura del repositorio

```
nexvio/
├── apps/
│   ├── backend/   NestJS — API, RLS, Socket.io (puerto 3000)
│   ├── web/       Next.js — panel del staff (puerto 3001)
│   └── mobile/    Expo — app del asistente (Expo Go; build en el 8.9)
├── docs/          tesis, este HANDOFF, GUIA_DEV, resumen para la documentación
├── package.json
└── pnpm-workspace.yaml   (incluye la autorización de builds nativos)
```
Detalle de carpetas: GUIA § 3.

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

## Estado actual (Fase 4 — Inscripciones + app móvil base) ✅ COMPLETA

Fase 4 completa: el **backend de inscripciones + gestión de usuarios** y la **app
móvil del asistente** (login, congresos, agenda e inscripción).

- [x] **Tabla `inscripcion`** (ERD: usuario ↔ congreso). Campos: `estado`
  (`confirmada`|`cancelada`) y `registrado_en`. Única `(congreso_id, usuario_id)`.
  Migración `fase4_inscripciones` + su RLS `rls_inscripcion` (SQL de referencia en
  `prisma/setup/04_rls_inscripcion.sql`).
- [x] **Módulo `inscripciones`** (`src/inscripciones/`): el asistente se inscribe a
  sí mismo (`POST /congresos/:id/inscripciones`), ve sus inscripciones
  (`GET /inscripciones/mias`) y las cancela (`DELETE /inscripciones/:id`, soft →
  `cancelada`, solo la propia). El staff ve los inscritos
  (`GET /congresos/:id/inscripciones`).
- [x] **Decorador `@UserId()`** (`src/auth/user-id.decorator.ts`): la identidad de
  quién se inscribe sale del `sub` del JWT, nunca del cuerpo.
- [x] **Ajuste en `congresos.service.borrar`**: ahora arrastra también las
  inscripciones del congreso (no hay `ON DELETE CASCADE`).
- [x] **Gestión de usuarios** (`src/usuarios/`): `POST /usuarios` y `GET /usuarios`
  (admin/organizador) para dar de alta y listar asistentes. Reutiliza el
  `SupabaseAdminService` con la misma compensación. Solo crea `participante` o
  `coordinador` (sin escalar privilegios). Prueba `e2e_gestion_usuarios.js` (verde);
  deja el asistente fijo `test.asistente@nexvio.dev` / `asistente123` para el móvil.
- [x] **App móvil (Expo/React Native)** en `apps/mobile/`: cliente de Supabase con
  sesión en `AsyncStorage`, navegación guiada por la sesión, pestañas Congresos /
  Mis congresos, detalle con **agenda** y botón **Inscribirme/Cancelar**. La URL del
  backend se deriva de la IP del PC (Expo `hostUri`), no de `localhost`.
- [x] **Seed de demo** `prisma/setup/06_seed_agenda_demo.js`: carga 2 sesiones + 1
  ponente a un congreso (idempotente) para que la agenda se vea en la sustentación.
- [x] **Prueba de cierre** `prisma/tests/e2e_fase4_inscripciones.js`: inscribir,
  duplicado→409, `mias`, lista staff, cancelar/reactivar y aislamiento opcional
  Org B. **Pasa (verde).**

### Gotchas de Fase 4 (backend)
- **Se repitió el gotcha de Windows:** tras la migración, el cliente de Prisma no se
  regeneró porque `start:dev` estaba corriendo → *"Property 'inscripcion' does not
  exist on type 'TransactionClient'"*. Solución: parar `start:dev` →
  `npx prisma generate` → arrancar de nuevo.

### ✅ Decisión tomada: cuentas de asistente — Opción 1 (staff las crea)
El asistente NO se auto-registra (por ahora): el staff lo da de alta con
`POST /usuarios`. Así la app móvil solo necesita **login**. El auto-registro público
(código de evento) queda para la etapa de "producto a mercado".

### ⏳ Pendiente de confirmar con los dueños: modelo de registro/enrolamiento
Sebastián notó (sesión Fase 4) que el flujo previsto podría ser que cada persona se
registre a UN congreso específico (p. ej. con un código de evento), en vez de ver la
lista completa de congresos de su organización. **Pendiente de confirmar con los
dueños del proyecto (Grupo Studio Sebia).** Impacto si se cambia: es un cambio
ACOTADO — el login (Supabase Auth), el multi-tenant/RLS, la tabla `inscripcion` y las
pantallas de detalle/agenda/inscribirse NO cambian; solo la "puerta de entrada" (cómo
llega la persona a su primer congreso): añadir un código al congreso, un endpoint
público de auto-registro que reutilice `OnboardingService` + inscripciones, y una
pantalla móvil de "unirme con código". Se abordaría como bloque nuevo cuando la
empresa responda.

## Estado actual (Fase 5 — Participación en vivo con Socket.io) ✅ COMPLETA

Preguntas moderadas y encuestas en tiempo real, móvil↔panel. Lo técnicamente nuevo:
Socket.io.

- [x] **4 tablas** (`pregunta`, `encuesta`, `opcion_encuesta`, `respuesta_encuesta`)
  con RLS. `respuesta_encuesta` con `@@unique(encuesta_id, usuario_id)` = 1 voto.
  Migraciones `fase5_participacion` + `rls_participacion`.
- [x] **REST `src/participacion/`**: preguntas (enviar/listar/moderar) y encuestas
  (crear/listar/abrir-cerrar/votar/resultados). Vista por rol con `@RolActual()`.
- [x] **Socket.io** (`realtime.gateway.ts`): auth en middleware `server.use`, salas
  `sesion:<id>` validadas por tenant, patrón "avisar y refrescar"
  (`preguntas:cambio` / `encuestas:cambio`; los clientes refrescan por REST).
- [x] **Móvil**: `SesionScreen` (enviar preguntas, votar, resultados en vivo);
  sesiones tocables. Dep nueva: `socket.io-client`.
- [x] **Panel web**: navegación congreso→sesión + moderación en vivo (moderar
  preguntas, crear/abrir/cerrar encuestas, resultados). Dep nueva: `socket.io-client`.
- [x] **3 pruebas e2e** (preguntas, encuestas, realtime) — verdes.

### Gotchas de Fase 5
- **P2028 (Prisma) bajo ráfagas del tiempo real.** El socket dispara muchos refrescos
  simultáneos; como cada query corre en transacción, el pool se saturaba un instante y
  Prisma daba *"Unable to start a transaction in the given time"*. Fix en
  `PrismaService`: `maxWait: 15000`, `timeout: 20000` y pool `max: 15`.
- **Auth del socket en middleware, no en `handleConnection`.** `handleConnection` es
  asíncrono y el `join_sesion` podía llegar antes de terminar la verificación
  (condición de carrera). Se movió a `server.use` (corre antes de la conexión).
- **`@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io`** en el backend;
  `socket.io-client` en móvil y web.
- **Zona horaria:** sigue pendiente pulir (las sesiones se guardan en UTC).

## Estado actual (Fase 6 — Networking) ✅ COMPLETA

Interés mutuo → match → chat con límite, entre asistentes. Reusa el Socket.io de la
Fase 5 (gateway movido a `src/realtime/`, módulo compartido).

- [x] **3 tablas** (`interes_networking`, `conexion`, `mensaje_chat`) con RLS.
  `interes` único por dirección y congreso; `conexion.interes_id` único.
  Migraciones `fase6_networking` + `rls_networking`.
- [x] **REST `src/networking/`**: directorio (con estado por persona), marcar interés
  (detecta match y crea conexión), mis conexiones, y **chat** (enviar/listar con
  límite de 20, solo los dos integrantes).
- [x] **Socket.io**: sala `conexion:<id>` (validada por RLS) + aviso
  `mensajes:cambio`. Gateway extraído a `RealtimeModule` (usado por participación y
  networking).
- [x] **Móvil**: botón Networking en el congreso → directorio → chat (burbujas,
  contador de restantes, se cierra al límite).
- [x] **2 pruebas e2e** (networking, chat) — verdes. El chat crea/usa un 2do
  asistente fijo: `test.asistente2@nexvio.dev` / `asistente123`.

### Gotchas de Fase 6
- **Relaciones dobles a `Usuario`** (emisor/receptor en interés; autor en mensaje):
  requieren `@relation("nombre")` en Prisma para desambiguar.
- **Gateway compartido:** se movió de `participacion/` a `realtime/` y se exporta vía
  `RealtimeModule`; participación y networking lo importan.
- **`congresos.borrar`** ahora también arrastra el networking (interés→conexión→mensajes).

## Reunión con el cliente (sep-2026) — decisiones clave y nueva Fase 8

Con las Fases 0–6 completas, se hizo una reunión con el cliente (Grupo Studio Sebia /
AMCPER). Estas decisiones REORDENAN y AMPLÍAN el plan.

### Identidad visual (aprobada)
- **Opción A**: violeta **#5A46F0** + coral **#FF7A59**, con **modo claro y oscuro**
  (se construirá con **tokens de tema**), estructura/organización de la app A.
- **Logo**: concepto **red de nodos** (símbolo + wordmark en Space Grotesk). Borrador
  entregado (SVG/PNG, claro/oscuro, ícono); se afina con el cliente.

### Modelo de registro (RESUELVE la decisión que estaba pendiente)
Nexvio **NO** maneja pagos ni inscripciones. La persona se inscribe y paga
directamente con la organización; la organización envía un **Excel** con los
registrados y el **admin del congreso lo importa** desde el panel.
- **Plantilla Excel**: nombres, apellidos, tipo+número de documento, tipo de
  suscripción, congreso, fecha de inscripción; opcionales: cargo, empresa, país,
  teléfono (correo opcional).
- **Credenciales**: el asistente entra con **usuario** tipo `JPGarcia` (iniciales del
  nombre + apellido; sufijo si colisiona) + **contraseña temporal** que cambia al
  primer ingreso. Internamente el usuario se guarda como **correo sintético** (Supabase
  Auth trabaja con correo); el asistente nunca lo ve.
- El asistente ve **SOLO el congreso** al que está inscrito.

### Roles
- **Superadmin** = rol `admin` global → crea organizaciones y **congresos** (esto último falta).
- **Admin del congreso** = rol `organizador` → gestiona su congreso desde el panel (menú lateral).
  No hace falta un rol nuevo, solo construir sus pantallas.
- `coordinador` (moderación) y `participante` (asistente) siguen igual.

### Panel del admin (menú lateral) — el grueso de la Fase 8
1. **Usuarios**: CRUD de los inscritos a SU congreso + **importar Excel**.
2. **Agenda**: agenda por día (charlas y breaks), asignar speaker a cada charla.
3. **Speakers**: nombre, cargo, empresa, foto, país (bandera); enlazados con la agenda.
4. **Sponsors**: subir imágenes de sponsors para mostrarlas en la app.
5. **Notificaciones push**: enviar mensajes push a los asistentes (Expo Push).
6. **Información/ayuda**: guía de uso del panel para admins no técnicos.
- Además, **personalización por congreso** (logo, colores, imágenes) reflejada en la app.

### Integraciones nuevas (a montar en la Fase 8)
- **Supabase Storage** (imágenes: logos, fotos de speakers, sponsors, portadas).
- **Expo Push Notifications** (token por dispositivo + envío desde el backend).
- **Lectura de Excel** (`.xlsx`) en el backend para la importación.

### Ideas sugeridas (opcionales, a confirmar con el cliente)
Favoritos de agenda + recordatorios push; mini-dashboard de métricas para el admin;
certificado de asistencia (PDF); check-in con QR; y un texto de tratamiento de datos
(**Ley 1581**) al primer ingreso, ya que importamos datos personales.

### Reordenamiento del plan
La **Fase 7 (WhatsApp + IA)** se mueve al **FINAL** (cuando el cliente apruebe el
sistema). Antes van la **Fase 8 (identidad visual + panel admin + producto completo)**
y la **Fase 9 (verificación final)**.

## Próximos pasos — FASE 8 (reestructurada)

Tras la reunión con el cliente (ver sección anterior), el orden es
**Fase 8 → Fase 9 → Fase 7**. La Fase 8 se aborda en bloques (cada uno cierra con prueba):

- **8.0** ✅ Identidad visual: tokens de la Opción A (claro/oscuro), logo, montar shadcn (web) + NativeWind (móvil).
- **8.1** ✅ Modelo de datos: perfil de asistente, sponsor, personalización, notificaciones, campos de speaker, tipo de sesión (break).
- **8.2** ✅ Superadmin: crear congresos (+ asignar admin) + layout del panel.
- **8.3** ✅ Admin · Usuarios: CRUD + importar Excel (nuevo login por usuario + contraseña temporal).
- **8.4** ✅ Admin · Agenda + Speakers (+ Supabase Storage adelantado del 8.5).
- **8.5** ✅ Admin · Sponsors + Personalización (reflejada en la app).
- **8.6** ✅ Admin · Notificaciones push (Expo, al momento y programadas) + Ayuda editable.
- **8.7** App móvil: *(el diseño ya se hizo en la feria)* + perfil + networking mejorado + ver SOLO su congreso + reflejar personalización/speakers/sponsors/notifs.

Luego **Fase 9** (pruebas, carga, seguridad, Ley 1581) y por último **Fase 7**
(WhatsApp + IA). Pendientes menores arrastrados: zona horaria de sesiones (UTC) y la
suite de Jest (`clearMocksOnScope`).

**Al cerrar cada bloque: actualizar `docs/GUIA_DEV.md` (guía viva) y este HANDOFF.**

## Modo de trabajo acordado

Nivel: intermedio. El asistente da el paso a paso y el autor lo ejecuta. Ir en grupos grandes de trabajo pero detenerse si surge un problema. Cada fase cierra con una prueba. Commits frecuentes (Conventional Commits). Explicaciones amigables con ejemplos.

**Entendimiento del código (importante para Sebastián):** como el asistente escribe el código, Sebastián necesita ir entendiéndolo. Por eso: (1) en cada bloque el asistente explica qué hace el código nuevo y por qué; (2) se mantiene una **guía viva `docs/GUIA_DEV.md`** que se amplía al cerrar cada bloque (estructura de carpetas, qué hace cada archivo, flujo de una petición, decisiones clave). Al final del desarrollo debe existir una documentación detallada y fiel de cómo funciona la app y el código.

## Estado actual (Fase 8 · Bloque 8.0 — Identidad visual) ✅ COMPLETO

Primer bloque de la Fase 8 reestructurada. Monta la identidad de marca, el logo y
las herramientas de UI en web y móvil. **No** rediseña pantallas aún (eso llega con
el panel del admin y el rediseño del móvil); deja el sistema listo.

- **Fuente de verdad**: `docs/IDENTIDAD_VISUAL.md` (tokens Opción A, claro/oscuro).
  Documento del logo para la sustentación: `docs/logo-nexvio.html`.
- **Web (shadcn)**: init `base-nova` (Base UI + Lucide) sobre Next 16 + Tailwind v4 +
  React 19; tokens de marca en `globals.css` (`:root`/`.dark` + `@theme inline`, con
  `--coral`); tema claro/oscuro con `next-themes` (`theme-provider` + `mode-toggle`
  flotante temporal); Space Grotesk para titulares/wordmark; componentes `button/card/
  input/label`; logo (`components/logo.tsx`) + favicon (`app/icon.svg`); las 4 pantallas
  de staff (login, congresos, detalle, moderación) convertidas a tokens.
- **Móvil (NativeWind)**: NativeWind 4.2.6 + Tailwind 3.4.17 (babel, metro fusionado con
  el monorepo, `global.css` con tokens RGB, `darkMode: 'media'`, `userInterfaceStyle:
  automatic`); logo con `react-native-svg` (`src/components/Logo.tsx`); íconos de app
  regenerados; login convertido.
- **Logo**: concepto **red de nodos** — la N de Nexvio dibujada como 5 nodos enlazados,
  con un **nodo coral** de acento (la conexión que se enciende). Símbolo + wordmark en
  Space Grotesk; variantes claro/oscuro/ícono. Artefacto publicado (además del HTML en docs).

### Gotchas nuevos del Bloque 8.0 (¡clave!)

- **shadcn en Tailwind v4** NO usa `tailwind.config.js`: config en `components.json`,
  tokens en `globals.css`. El proyecto web es **Next 16 + React 19** (no Next 14 como
  decía una nota vieja).
- **Expo Go se autoactualizó a SDK 57** y el proyecto es **SDK 54** → "Project is
  incompatible with this version of Expo Go". Solución usada: instalar la Expo Go de
  **SDK 54** (link `https://expo.dev/go?sdkVersion=54&platform=android&device=true`) y,
  opcional, desactivar su auto-update en Play Store. Alternativa (aplazada, bloque
  aparte): subir el proyecto a **SDK 57** (trae **React Native 0.86**, salto grande).
- **pnpm + NativeWind**: Metro no resolvía `react-native-css-interop/jsx-runtime` porque
  pnpm lo aísla dentro de `nativewind`. Fix: agregarlo como dependencia **directa** del
  móvil, fijada a la que espera NativeWind: `pnpm add react-native-css-interop@0.2.6`.
- **Ícono de app**: NO se ve en Expo Go (siempre muestra el ícono de Expo Go); solo
  aparece en una **build real** (EAS). Los assets ya quedaron correctos.

### Pendientes arrastrados del 8.0 (para el momento que corresponda)

- **Toggle de tema claro/oscuro en el MÓVIL** (hoy sigue al SO automáticamente). Para un
  botón manual: pasar NativeWind a `colorScheme`/`darkMode: 'class'`. → encaja en **8.7**.
- **Space Grotesk en el móvil** (hoy el wordmark usa la fuente del sistema) — requiere
  `expo-font`. → 8.7.
- **Mover el `ModeToggle`** del web de flotante a la **cabecera real** del panel. → al
  construir el layout del admin (8.2+).
- **Animaciones de marca** (intro con los nodos apareciendo, cargas con nodos): viable
  con SVG/Reanimated; se hará en la capa de pulido (8.7 / Fase 9).

### Método / commits (importante)

- **Commit por bloque** (decisión revisada en oct-2026; antes se había planteado un
  único commit al final del Módulo 8). El Bloque 8.0 quedó en el commit
  `d047567 feat(8.0): identidad visual — tokens de marca, shadcn (web) + NativeWind
  (movil), logo red de nodos`. - Flujo actualizado: los archivos se **escriben directo en la carpeta** (no se pasan por
  el chat); Sebastián revisa y hará el commit.

## Actualización (oct-2026) — Traspaso a chat nuevo

**Bloque 8.0 — Identidad visual: CERRADO y COMMITEADO** (`d047567`). Lo construido
quedó documentado en la sección de 8.0 (arriba) y en `GUIA_DEV.md`.

**Documento académico (informe de avance) — ENTREGADO.** Se llenó la plantilla
oficial del programa: `docs/NEXVIO_Informe_Avance_Plantilla.docx` (contenido mapeado
desde `NEXVIO_Vfinal.md` + secciones nuevas 3.2 Marco teórico y 6 Resultados, con 3
figuras propias: arquitectura, flujo RLS y avance por fases). Alineado a la rúbrica
de 4 criterios. Encajes de estructura: el análisis BPSC va dentro de 2.1 (la plantilla
no trae un 2.2 aparte) y la gestión del proyecto (alcance/tiempo/presupuesto/
comunicaciones/riesgos) va dentro de "Resultados y discusión" (la plantilla no trae
sección de Gestión aparte).

**Pendientes SOLO del documento (no del desarrollo):** aplicar al `.docx` la OPEX
corregida (AWS → Supabase/Upstash + host del backend), CAPEX (AWS S3 → Supabase
Storage), y renumerar referencias por orden de aparición quitando las de Cognito y S3;
actualizar la tabla de contenido en Word, borrar los textos azules de la plantilla y
llenar portada/resumen. (Todo esto se dejó listo en el chat anterior, sin aplicar al
archivo.)

## Estado actual (Fase 8 · Bloque 8.1 — Modelo de datos) ✅ COMPLETO

Cimiento de todo el panel del administrador (8.2–8.7). **No construye pantallas**:
solo amplía la base de datos con lo que pidió el cliente en la reunión.
Detalle completo y el "por qué" de cada decisión en `GUIA_DEV.md` § 20.

- [x] **Columnas nuevas en 5 tablas existentes** (`fase8_modelo_datos`):
  - `usuario` → perfil de asistente: `username`, `apellidos`, `tipo_documento`,
    `numero_documento`, `telefono`, `cargo`, `empresa`, `pais`, `pais_codigo`,
    `foto_url`, `debe_cambiar_password`, `acepto_datos_en` (Ley 1581).
  - `congreso` → `descripcion`, `ciudad`, `lugar`, `zona_horaria`
    (default `America/Bogota`).
  - `sesion` → `tipo` (`charla`|`break`|`taller`|`plenaria`), `descripcion`, `orden`.
  - `ponente` → `cargo`, `empresa`, `pais`, `pais_codigo`, `orden`.
  - `inscripcion` → `tipo_suscripcion`, `origen` (`manual`|`excel`).
- [x] **4 tablas nuevas**: `sponsor`, `personalizacion_congreso` (1:1 con congreso),
  `dispositivo_push` (token de Expo por aparato) y `notificacion` (historial de push).
- [x] **RLS** de las 4 tablas nuevas — migración `rls_fase8_modelo_datos`; SQL de
  referencia en `prisma/setup/07_rls_fase8.sql`.
- [x] **Prueba de cierre** `prisma/tests/e2e_fase8_1_modelo.js` — columnas nuevas,
  4 tablas nuevas, las 2 restricciones (`P2002`) y el aislamiento RLS
  (fail-closed + Org B ciega + `WITH CHECK`). Se autolimpia.

### Decisiones y gotchas del Bloque 8.1

- **`tipo_suscripcion` vive en `inscripcion`, no en `usuario`.** Es un dato de la
  relación persona↔congreso: la misma persona puede ser "Miembro" en un congreso y
  "General" en otro. Regla: si un dato cambia según el congreso, va en la tabla que
  une a la persona con el congreso.
- **`String` + `@default` en vez de `enum`** para `tipo`, `nivel`, `destino`, `origen`…
  Un `enum` de Postgres exige migración para agregar un valor; con `String` basta
  tocar el DTO. Se sigue la convención que ya tenía el proyecto en los `estado`.
  El único `enum` real sigue siendo `Rol` (conjunto cerrado del que depende el
  `RolesGuard`).
- **Imágenes = URL, no bytes.** Logos, portadas y fotos van a **Supabase Storage**
  (se monta en 8.5); en la BD solo vive la URL (igual que `ponente.foto_url`).
- **`dispositivo_push`: único por `(usuario_id, expo_push_token)`**, no por token
  solo. Con RLS, una fila de otro tenant con el mismo token sería invisible y el
  INSERT fallaría con un duplicado inexplicable desde la app.
- **`@@unique([organizacion_id, numero_documento])` en `usuario`** evita duplicar
  personas al reimportar el Excel. En Postgres los `NULL` **no chocan** entre sí, así
  que el staff sin documento no se ve afectado.
- **El RLS filtra filas, no columnas** → las 5 tablas que solo recibieron columnas no
  necesitaron tocar su política. Los `GRANT` los hereda `nexvio_app` de los
  *default privileges* de `01_app_role.sql`.
- **Migración no destructiva:** todas las columnas nuevas son opcionales o traen
  `@default`, así que las filas existentes no se rompen.
- **El `WITH CHECK` rechaza con `P2039`, no `P2002`.** Es el codigo de Prisma para
  "la BD rechazo la operacion" (aqui, la politica de RLS). Comportamiento correcto.
- **⏳ Pendiente: actualizar los DIAGRAMAS.** El **ERD** (`docs/diagramas.html`, la
  figura del ERD en `NEXVIO_Vfinal.md` y la del informe de avance) debe incluir las 4
  entidades nuevas y los atributos nuevos de `USUARIO`, `CONGRESO`, `SESION`,
  `PONENTE` e `INSCRIPCION`. El **C4** cambiara mas adelante (Supabase Storage en 8.5,
  Expo Push en 8.6). La **secuencia de RLS** NO cambia. Decision: hacerlo de una sola
  vez al cerrar el Modulo 8, para no retocarlo en cada bloque.
- **Se repitió el gotcha de Windows** (esperable): si `start:dev` está corriendo, el
  cliente de Prisma no se regenera → parar `start:dev`, `npx prisma generate`,
  arrancar de nuevo.

## Estado actual (Fase 8 · Bloque 8.2 — Superadmin + layout del panel) ✅ COMPLETO

Resuelve cómo trabaja el superadmin, que no pertenece a ninguna organización (su
`organizacion_id` es NULL y el RLS —bien— le devuelve 0 filas). Detalle completo y
el porqué de cada decisión en `GUIA_DEV.md` § 21.

### Decisiones de diseño tomadas en este bloque

- **Alcance del "admin del congreso": por ORGANIZACIÓN.** Un `organizador` ve todos
  los congresos de su organización. En la práctica se crea un organizador por
  congreso, así que el límite es de convención, no de sistema.
  **Evolución prevista** (si el cliente la pide): tabla `congreso_admin`
  (organizador ↔ congreso) que se añade ENCIMA, sin rehacer nada — habría que
  filtrar también por ella en las pantallas de 8.3–8.6.
- **Suplantación de tenant (no una política de "superadmin ve todo").** Se
  descartó a propósito la política RLS de superadmin porque es un interruptor que
  APAGA el aislamiento — justo el núcleo de la tesis. Con la suplantación el RLS
  queda intacto y una petición vive siempre en UN solo tenant.

### Lo construido

- [x] **Suplantación de tenant** (`src/auth/tenant-context.middleware.ts`): el
  superadmin manda `X-Organizacion-Id` y esa pasa a ser la organización de la
  petición. La cabecera **solo se obedece si el TOKEN dice `rol: admin`**; para
  cualquier otro rol se ignora. Efecto dominó: TODOS los controllers existentes
  funcionan para el superadmin sin cambiar una línea.
- [x] **Dos funciones `SECURITY DEFINER` acotadas** (migración
  `fase8_funciones_superadmin`; SQL en `prisma/setup/08_funciones_superadmin.sql`):
  `nexvio_listar_organizaciones()` (para el selector) y
  `nexvio_panorama_congresos()` (la vista global que pidió el cliente, con
  `en_curso` y conteos). `STABLE` + `SET search_path` + `REVOKE FROM PUBLIC` +
  `GRANT` solo a `nexvio_app`. Devuelven columnas contadas, cero datos de negocio.
- [x] **Módulo `src/superadmin/`**: `GET /superadmin/organizaciones` y
  `GET /superadmin/panorama`. Las únicas dos rutas de la API sin tenant (y el único
  service que no usa `runInTenant`).
- [x] **Alta de organizadores**: `POST /usuarios` acepta `rol: 'organizador'` pero
  solo si quien pide es `admin` (anti escalada de privilegios, vía `@RolActual()`).
- [x] **Campos nuevos del congreso conectados**: `descripcion`, `ciudad`, `lugar` y
  `zona_horaria` en los DTOs de crear/actualizar y en el service (hacía falta: el
  `ValidationPipe` global tiene `forbidNonWhitelisted: true`).
- [x] **Panel web con menú lateral**: route group `app/(panel)/` con
  `layout.tsx` (barra lateral + cabecera). `congresos/` y `sesiones/` se MOVIERON
  ahí dentro (las URLs no cambian). `components/panel/` con el contexto,
  la barra lateral, la cabecera y el **selector de organización**.
  Las entradas de 8.3–8.6 ya están en el menú marcadas como "pronto".
- [x] **`ModeToggle` movido** del botón flotante provisional a la cabecera real
  (✅ pendiente arrastrado del 8.0, resuelto).
- [x] **Pantallas nuevas**: `/superadmin` (panorama con tarjetas y botón "Entrar"),
  `/superadmin/organizaciones` (lista + alta de organización con su primer
  organizador) y `/congresos/nuevo` (alta de congreso, sirve igual para
  organizador y superadmin).
- [x] **Prueba de cierre** `prisma/tests/e2e_fase8_2_superadmin.js` — **17/17 verde**.

### Ajustes tras la primera revisión visual (mismo bloque)

- [x] **`congreso.pais` y `congreso.pais_codigo`** (migración `fase8_congreso_pais`)
  — el nombre visible y el ISO-3166 alpha-2 por separado, igual que en `ponente`
  y `usuario`.
- [x] **`components/ui/selector-buscable.tsx`** (combobox): se escribe para
  filtrar pero hay que ELEGIR de la lista, para normalizar los datos. Busca sin
  tildes, teclado completo, y modo `permitirLibre` para lo que el catálogo no
  cubre. Catálogos en `datos/paises.ts` y `datos/ciudades.ts` (las ciudades
  dependen del país; cambiar el país limpia la ciudad). **Se reusará en 8.4**
  para la ficha de speakers.
- [x] **`components/panel/dialogo-confirmar.tsx`**: confirmación propia (no
  `window.confirm`, que ignora el tema oscuro y la marca). Ya se usa al cerrar
  sesión; tiene variante `peligroso` para borrados y para el envío de push.
- [x] **Cabecera en tres zonas** (identidad · organización activa · acciones): el
  selector queda **centrado y destacado** con la etiqueta "Trabajando en".
  Motivo: si el superadmin no tiene presente en qué cliente está, puede editar
  el congreso equivocado.
- [x] **Menú lateral: una sola entrada activa.** Antes `/superadmin` y
  `/superadmin/organizaciones` se resaltaban a la vez (una es prefijo de la
  otra). Ahora gana la coincidencia MÁS LARGA, y funciona solo para cualquier
  ruta anidada que se agregue después.
- ⏳ **El diseño fino queda para el 8.7** (decisión de Sebastián): estos cambios
  fueron de funcionamiento, no de estética.

### Gotchas y notas del 8.2

- **`apiFetch` manda SIEMPRE la cabecera** `X-Organizacion-Id` si hay una
  organización elegida en `localStorage`. Es inofensivo para los no-admin (el
  backend la ignora) y evita condicionales por todo el frontend.
- **Al cambiar de organización se recarga la página entera** (no `router.push`),
  a propósito: no queda ni un dato del cliente anterior en pantalla.
- **El rol se lee del JWT en el navegador sin verificar la firma** (`lib/sesion.ts`).
  Es seguro porque ahí solo se decide QUÉ PINTAR; los permisos los aplica el backend.
- **⚠️ Limitación conocida — Socket.io no entiende la suplantación.** El gateway
  valida la sala con el `organizacion_id` del TOKEN, no con la cabecera. El
  superadmin puede gestionar un congreso ajeno pero no moderar en vivo. Se arregla
  pasando la organización en el handshake del socket. **Pendiente.**
- **El `Button` del panel usa Base UI y NO tiene `asChild`.** Para un enlace con
  pinta de botón se usa `<Link className={buttonVariants({...})}>`.
- **Borrar `.next`** tras mover carpetas de rutas: la caché de Next guarda los
  caminos viejos y da errores de módulo inexistente hasta que se regenera.
- **Credenciales de prueba**: ahora viven en `.credenciales-dev.md` en la raíz
  (añadido al `.gitignore`). Utilidad nueva para reponer una clave olvidada:
  `node prisma/setup/09_cambiar_password.js <email> <nueva>`.

## Estado actual (Fase 8 · Bloque 8.3 — Usuarios e importación de Excel) ✅ COMPLETO

Cómo entran las personas al sistema. Detalle completo en `GUIA_DEV.md` § 22.

### Decisiones de diseño del bloque

- **Importación en DOS pasos** (previsualizar → confirmar). Un Excel con un error
  puede crear 200 cuentas basura sin forma de deshacerlo desde el panel.
- **Las credenciales se entregan en un Excel descargable**, no por correo: Nexvio
  no manda correos y el del asistente es opcional. La organización las reparte
  como ya lo hace hoy.
- **"Usuarios" vive dentro del congreso**, porque la inscripción y el tipo de
  suscripción son por evento.

### Lo construido

- [x] **`username.util.ts`**: `JPGarcia` (iniciales + primer apellido, sin
  tildes), colisiones con sufijo, **correo sintético**
  `jpgarcia@<slug-org>.nexvio.local` (único en todo el proyecto de Supabase; el
  asistente nunca lo ve) y contraseña temporal sin caracteres confundibles
  (nada de O/0 ni I/l/1), con `randomInt`.
- [x] **`asistentes.service.ts`**: listar / crear / editar / quitar del congreso.
  `cargarContexto()` trae usernames y documentos de una sola vez (con 300 filas,
  evita 300 consultas).
- [x] **`importacion.service.ts`** (exceljs): analizar y ejecutar. Encabezados
  flexibles por sinónimos ("Celular" = "Teléfono"), 4 estados por fila
  (`nueva` | `se_inscribe` | `ya_inscrita` | `error`), generación de la
  **plantilla** y del **Excel de credenciales**.
- [x] **Tercera función `SECURITY DEFINER` acotada**: `nexvio_email_por_username`
  (migración `fase8_login_username`; SQL en
  `prisma/setup/10_funcion_login_username.sql`). Devuelve UNA columna.
- [x] **`src/auth/`**: `POST /auth/resolver-usuario` (pública),
  `GET /auth/yo` y `POST /auth/cambiar-password`. Decorador `@OrgIdOpcional()`.
- [x] **Panel**: `/congresos/:id/asistentes` (lista, buscador, alta manual,
  quitar), `/congresos/:id/asistentes/importar` (dos pasos + descarga de
  credenciales) y `/usuarios` (elige congreso). Entrada "Usuarios" del menú ya
  activa. `apiSubirArchivo` y `apiDescargar` en `lib/api.ts`.
- [x] **Prueba de cierre** `prisma/tests/e2e_fase8_3_usuarios.js` — **verde**.

### Ajustes tras la primera revisión visual (mismo bloque)

- [x] **Menú de acciones por fila** (ver ficha / editar / restablecer contraseña /
  quitar) + **ficha completa en panel lateral** al hacer clic en la fila.
  Componentes nuevos reutilizables: `menu-acciones.tsx` y `panel-lateral.tsx`.
- [x] **Edición completa**, incluidos correo y documento. El correo se cambia
  TAMBIÉN en Supabase Auth (primero allí, que es lo que puede fallar; si la base
  lo rechaza después, se revierte en Auth). El `username` NO se puede cambiar:
  ya está repartido.
- [x] **Restablecer contraseña** de una persona
  (`POST /asistentes/:id/restablecer-password`).
- [x] **Listado de acceso** (`POST /congresos/:id/listado-acceso`): devuelve a
  **TODOS** los inscritos con su usuario y genera contraseña nueva solo para
  quienes aún no han entrado. El Excel trae una columna **Estado**: "Entregar
  esta contraseña temporal" o "Ya tiene su propia contraseña" (fila en gris, sin
  clave). Resuelve el caso real: los Excel llegan por tandas durante semanas y
  el admin necesita en cualquier momento UN documento con todo el mundo.
  **Dos formas sanas y excluyentes de trabajar:** (A) no descargar nada durante
  las tandas y pulsar "Listado de acceso" una sola vez cerca del evento, o (B)
  descargar el archivo de cada tanda al importarla y no usar nunca el listado
  completo (regeneraría las ya entregadas).
- [x] **`baseUsername` tolerante** a nombres incompletos: sin apellido usa el
  nombre entero, sin nombre el apellido, y si no hay nada usable, `Usuario`.
  `apellidos` pasó a **opcional** en el DTO y en el Excel.

> **⚠️ No existe "ver la contraseña", y no es una limitación del panel.** Supabase
> guarda un hash (huella de un solo sentido): nadie puede leer la original. Si un
> admin pudiera verla, podría suplantar a cualquiera, y un robo de la base se
> llevaría todo en texto plano. Lo que existe es **restablecer**. Vale la pena
> tenerlo claro para la sustentación: es una propiedad de seguridad, no un
> pendiente.

### Gotchas y notas del 8.3

- **Dependencias nuevas** (en `apps/backend`): `exceljs` y `@types/multer`.
- **`addWorksheet` es del LIBRO, no de la hoja.** Error de compilación que ya
  mordió una vez: `libro.addWorksheet(...)`, nunca `hoja.addWorksheet(...)`.
- **En `multipart/form-data` NO se pone `Content-Type` a mano.** El navegador lo
  genera con el *boundary*; si lo escribimos nosotros, el servidor no puede leer
  el archivo.
- **Las contraseñas temporales se ven UNA sola vez.** En la base solo queda el
  hash: no hay forma de recuperarlas, solo de generar otras con
  `09_cambiar_password.js`. El panel lo avisa.
- **Quitar a alguien borra la INSCRIPCIÓN, no a la persona** (puede estar en
  otros congresos, y borrar su `usuario` arrastraría preguntas, votos y chats).
- **⚠️ Enumeración de usuarios — riesgo asumido y documentado.**
  `/auth/resolver-usuario` permite en teoría probar nombres hasta descubrir
  cuáles existen. Se asume porque el usuario va impreso en la escarapela y la
  contraseña sigue siendo el muro. El error es idéntico al de contraseña
  incorrecta. **Mitigación pendiente para la Fase 9: limitar intentos por IP.**
- **Pendiente para el 8.7 (móvil):** la pantalla de login por usuario y la de
  cambio de contraseña al primer ingreso. El backend ya está listo.

## Preparación de la feria (oct-2026) ✅ COMPLETA

Sprint corto para mostrar el proyecto en una feria, con una regla: **que se viera
como producto sin cambiar la funcionalidad**. Rama `feria`, unida a `main` al
cerrar. Detalle completo en `GUIA_DEV.md` § 23. **La feria salió bien**: los
cambios le dieron mucha vida al proyecto.

### Lo construido

- [x] **Backend — la API acepta los campos del 8.1** (adelanta el 8.4): `tipo`,
  `descripcion` y `orden` en sesiones; `cargo`, `empresa`, `pais`, `pais_codigo`
  y `orden` en ponentes. `TIPOS_SESION` vive en `crear-sesion.dto.ts`. El detalle
  del congreso trae los ponentes de cada sesión y ordena por `inicio` + `orden`.
- [x] **Seed de demostración** `prisma/setup/11_seed_feria.js`: 3 organizaciones
  (Medicina + Ingeniería de Software + Educación Digital), cada una con un
  congreso de 2 días, 6 ponentes y asistentes. Pasa por la API como superadmin
  con `X-Organizacion-Id`. Idempotente.
- [x] **Limpieza** `prisma/setup/12_limpiar_orgs_prueba.sql`: borra las
  "Organización a/b <número>" que deja `e2e_onboarding_aislamiento.js`. Ya se
  corrió: quedaron 4 organizaciones (Org A – Medicina, Org B – Derecho y las 2
  nuevas).
- [x] **Panel — volver a la raíz al cambiar de organización**
  (`destinoSeguro()` en `panel-contexto.tsx`). Antes, cambiar de organización
  dentro de un congreso daba "No se pudo cargar el congreso" (404 del RLS).
- [x] **Panel — detalle del congreso** con agenda por día, breaks, etiquetas y
  ponentes. **Solo lectura**: la gestión es del 8.4.
- [x] **App móvil — rediseño completo** (Opción A de los mockups; adelanta el
  diseño del 8.7): `src/tema/tema.ts` (paleta clara/oscura, fuentes) y
  `src/components/ui.tsx` (Cabecera, Tarjeta, Etiqueta, Avatar, Boton...). Las 7
  pantallas con su JSX nuevo y **la lógica intacta**. Agenda por día con
  pestañas, EN VIVO, breaks no navegables, ponentes con bandera, ojito en el login.
- [x] **Fix: fechas de congreso un día antes** (se leen en UTC) — app y panel.
- [x] **Fix: el teclado tapaba los campos en Android** (`behavior="padding"`).

### Gotchas de la feria (resumen; detalle en GUIA § 23.7)

- **Fechas de congreso en UTC, horas de sesión en local.** Mezclarlas da un día
  de diferencia.
- **`edgeToEdgeEnabled` + teclado:** Android ya no encoge la ventana; el
  `KeyboardAvoidingView` debe usar `padding` también en Android.
- **"Failed to download remote update" (Expo Go)** = el dispositivo no llega al
  PC. Firewall (red Privada + regla para 8081 y 3000) o red distinta. En eventos,
  usar el **punto de acceso de un celular**; `--tunnel` no sirve.
- **Dependencias nuevas (móvil):** `expo-linear-gradient`, `expo-font`,
  `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/plus-jakarta-sans`
  (plugin `expo-font` en `app.json`). Tras instalar: `npx expo start -c`.
- **Fuentes personalizadas:** el grosor va en el nombre de la fuente; nunca
  combinar con `fontWeight`.
- **`index.lock` huérfano:** si pesa 0 bytes, `del .git\index.lock`. Para
  consultar sin crearlo: `git --no-optional-locks status`.
- **Cuentas de demo:** las contraseñas NO se guardan en el repo. Las imprime el
  seed; si se pierde una, `09_cambiar_password.js`. Para moderar preguntas en una
  demo, usar el **organizador** (no el superadmin, por el pendiente de Socket.io).

## Estado actual (Fase 8 · Bloque 8.4 — Agenda + Speakers) ✅ COMPLETO

El organizador arma toda la agenda desde el panel. Detalle en `GUIA_DEV.md` § 24.

### Decisiones tomadas con Sebastián

- **Zona horaria:** en el **panel**, las horas son las **del lugar del evento**
  (`congreso.zona_horaria`), esté donde esté el admin, y se muestran así en todo
  el panel. El **backend** convierte a UTC. La **app** muestra la zona **del
  teléfono** (congresos virtuales), con el aviso "Horas en tu zona horaria".
- **Supabase Storage se adelantó** del 8.5: sube el backend (por la
  suplantación) a un bucket **público** de imágenes; en la base solo va la URL.
- **Los cruces de horario se avisan, no se bloquean** (hay charlas en paralelo
  en salas distintas).
- **"Correr la agenda"** al cambiar el fin de una sesión: las siguientes del
  mismo día se mueven igual, en una sola transacción (todo o nada).
- Agenda y Speakers viven **dentro de cada congreso**, como Usuarios.

### Lo construido

- [x] **8.4.a — Backend:** `zona-horaria.util.ts` (`aInstante`, `diaEnZona`),
  `@Matches(FORMATO_FECHA_HORA)` en inicio/fin, `@IsTimeZone()` en el congreso,
  y 5 reglas en `sesiones.service.ts` (fin > inicio, dentro de fechas contadas
  en la zona del evento, break sin ponentes, ponente del mismo congreso).
- [x] **8.4.b — Speakers:** `/speakers` y `/congresos/:id/speakers`. Piezas
  nuevas: `ElegirCongreso` y `AvatarPonente`. La lista del backend trae las
  charlas de cada ponente.
- [x] **8.4.c — Agenda:** `/agenda` y `/congresos/:id/agenda`, `lib/zona.ts`,
  formulario con tipo, día, horas, sala, descripción y ponentes (sincroniza la
  diferencia). Aviso de cruces, `correr_siguientes` y `seccionDelMenu()` para
  el menú lateral. Selector de **zona horaria** al crear el congreso
  (`datos/zonas.ts`: el país la predefine).
- [x] **8.4.d — Foto:** `src/storage/` (`StorageService` exportable),
  `POST/DELETE /ponentes/:id/foto`, validación por **firma** del archivo,
  borrado de la foto vieja y de la del ponente borrado. Bucket:
  `prisma/setup/13_storage_bucket.sql` (**ya creado en Supabase**).
- [x] **8.4.e — Prueba de cierre** `prisma/tests/e2e_fase8_4_agenda.js`
  (37 verificaciones) + GUIA § 24.

### Gotchas del 8.4

- **Next 16 guarda la caché de desarrollo en disco** (`apps/web/.next`). Si
  aparecen 404 en páginas que existen o avisos "(stale)": detener el panel,
  `rmdir /s /q .next`, `npm run dev`.
- **`IsDateString` dejaba pasar fechas sin hora**; por eso inicio/fin usan
  `@Matches`.
- **Vacío = `null`, no `""`**, en los formularios del panel (y cuidado con
  `null.toUpperCase()` en el backend).
- La prueba de cierre **necesita el bucket creado**; sin él, los casos de foto
  fallan con "No existe el bucket de imágenes".

## Estado actual (Fase 8 · Bloque 8.5 — Sponsors + Personalización) ✅ COMPLETO

Cada congreso tiene su marca en la app y sus patrocinadores visibles. Detalle
en `GUIA_DEV.md` § 25.

### Decisiones del 8.5 (tomadas con Sebastián, oct-2026)

1. **Alcance de la personalización en la app:** solo las pantallas DEL CONGRESO
   (detalle, sesión, networking, chat) usan logo, portada y color del evento.
   Login y lista de congresos siguen con la marca Nexvio. (En el 8.7 el
   asistente verá solo su congreso, así que en la práctica toda su experiencia
   tendrá la marca del evento.)
2. **Color:** paleta sugerida de ~8 colores probados + opción de color propio,
   con **aviso de contraste** (regla WCAG) si el texto blanco no se lee.
3. **Tema por defecto** (`tema_default`: claro/oscuro/sistema): **se deja para
   el 8.7**. Por ahora la app respeta el modo del teléfono.
4. **Sponsors en la app, en dos lugares:**
   - Una **franja "Con el apoyo de"** arriba en el detalle del congreso (después
     de la inscripción, antes de la agenda): logos pequeños deslizables, Oro primero.
   - Al tocarla, la pantalla **"Patrocinadores"**: agrupados por nivel (Oro con
     logos grandes, luego Plata, Bronce, General), con botón "Visitar sitio web".
   - En el panel, el orden dentro de cada nivel se cambia con flechas ↑↓.
5. **Idea para el 8.7 (no ahora):** "Patrocinado por…" en una charla
   específica. Necesita un dato nuevo (qué sponsor patrocina qué sesión).
6. **Contraste de los colores (detalle del punto 2, al construir el 8.5.d):**
   - **Color principal:** lleva texto BLANCO encima (cabeceras, botones), así
     que el panel mide el contraste (fórmula WCAG) y avisa: ≥4.5 bien, 3–4.5
     "justo", <3 "no se lee". La paleta sugerida son 8 colores que superan 5:1.
     Es un aviso, no un bloqueo.
   - **Color de acento:** el color del texto encima (blanco u oscuro) **se
     elige solo** según el contraste (`textoSobre()`), así que cualquier acento
     funciona y no necesita aviso. Motivo: el propio coral de Nexvio da 2.6:1
     con texto blanco.
   - La cabecera usa un degradado del color principal hacia una versión 30 %
     más oscura (`oscurecer()`), como el violeta → morado de Nexvio.
   - La personalización se edita en **"Apariencia"** (`/congresos/:id/apariencia`),
     con vista previa del celular. No tiene entrada propia en el menú: se llega
     desde el detalle del congreso.

### Lo construido

- [x] **8.5.a — Backend de sponsors** (`src/sponsors/`): CRUD, logo en Storage,
  reordenar por nivel (`/sponsors/orden`), sitio web normalizado. **Fix:** el
  borrado de congresos no conocía `sponsor`, `personalizacion_congreso` ni
  `notificacion` (habría fallado por clave foránea) y ahora también limpia las
  imágenes del congreso en Storage.
- [x] **8.5.b — Panel · Sponsors:** por nivel, flechas ↑↓, logo sobre blanco.
- [x] **8.5.c — Backend de personalización** (`congresos/personalizacion.*`):
  `GET`/`PUT` (upsert) de colores, `POST`/`DELETE` de logo y portada.
- [x] **8.5.d — Panel · Apariencia** (`/congresos/:id/apariencia`): paletas,
  color propio, aviso de contraste WCAG y vista previa del celular en vivo.
  `lib/color.ts` (contraste, `textoSobre`, `oscurecer`).
- [x] **8.5.e — App:** `MarcaContext` (`useMarca`/`useFijarMarca`), los
  componentes base aceptan colores y logo, franja "Con el apoyo de",
  pantalla **Patrocinadores**, y la marca en Detalle, Sesión, Networking y
  Chat. `legibleSobre()` mantiene legibles los textos de color en modo oscuro.
- [x] **8.5.f — Docs:** GUIA § 25. Pruebas: `e2e_fase8_5_sponsors.js` (16) y
  `e2e_fase8_5_personalizacion.js` (16).

### Gotchas del 8.5

- **Cada tabla nueva que cuelga del congreso hay que sumarla a
  `CongresosService.borrar()`.** Ya pasó una vez.
- **"EN CURSO" ahora va con texto oscuro** sobre el coral: es `textoSobre()`
  eligiendo lo que se lee (2.6:1 con blanco contra 7:1 con oscuro).
- En RN, un ancho en porcentaje construido con plantilla necesita
  ``as `${number}%` `` para que TypeScript lo acepte como `DimensionValue`.


## Estado actual (Fase 8 · Bloque 8.6 — Notificaciones + Ayuda) ✅ COMPLETO

El organizador envía avisos a los asistentes (al momento o programados) y el
panel tiene una Ayuda que el superadmin edita sin tocar código. **Con esto el
panel web queda completo: no hay más entradas "pronto" en el menú.** Detalle
técnico en GUIA § 26.

### Decisiones del 8.6 (tomadas con Sebastián, oct-2026)

1. **Envío:** lo prioritario es **enviar al momento**; además se pueden
   **programar** (p. ej. recordatorio antes de una charla).
2. **Ayuda:** contenido **editable por el superadmin**.
3. **Compilación (development build):** verificado en la documentación de Expo
   (SDK 54): Expo Go NO recibe push remotas en Android. Como el 8.7 va a tocar
   mucho la app (y librerías nativas obligan a recompilar), **la compilación y
   la prueba de push real se dejan para después del 8.7**.
4. **Construir sin compilar (aprobado):** todo el envío se hizo ya; en Expo Go
   la app **se salta** el registro del teléfono sin fallar, y una bandeja
   **"Avisos"** en la app muestra los avisos enviados (funciona en Expo Go y
   prueba el flujo panel → backend → app).

### Lo construido

- **8.6.a Backend** (`src/notificaciones/`): `ExpoPushService` (lotes de 100,
  apaga tokens `DeviceNotRegistered`), envío inmediato o programado (hora del
  lugar del evento, 1 min a 1 año), cancelar, historial, bandeja `/avisos`,
  registro de teléfonos. `ProgramadorService`: cada 60 s, "reclama" cada aviso
  antes de enviarlo (nadie lo recibe dos veces). Migración
  `fase8_notificaciones` (campo `programada_para` + 4ª función `SECURITY
  DEFINER`: `nexvio_notificaciones_vencidas()`).
- **8.6.b Panel:** `/notificaciones` → redactar con vista previa de pantalla
  bloqueada, enviar ahora (con confirmación) o programar, historial con estados
  y cancelar (se refresca cada 30 s).
- **8.6.c App:** `lib/push.ts` (registro protegido para Expo Go, olvidar el
  teléfono al cerrar sesión, tocar la push abre los Avisos), `AvisosScreen`
  (NUEVO, "hace 5 min", enlace a la charla) y tarjeta "N NUEVOS" en el detalle
  del congreso. Probado en tiempo real en Expo Go ✅.
- **8.6.d Ayuda:** tabla `articulo_ayuda` (la **primera tabla de plataforma**,
  sin `organizacion_id`), RLS por rol (`app.rol`, que ahora `runInTenant` fija
  junto a `app.org_id`), 5 artículos iniciales, página `/ayuda` con buscador y
  editor Markdown con vista previa en vivo (solo superadmin).
- **Bugs corregidos:** borrar una sesión con preguntas/encuestas fallaba (ya
  existía desde la Fase 5); los avisos de una sesión borrada se conservan sin
  enlace.

**Pruebas:** `e2e_fase8_6_notificaciones.js` **24/24** ✅ ·
`e2e_fase8_6_ayuda.js` 10 verificaciones.

### Gotchas del 8.6

- **Prisma 7:** `migrate dev` ya NO regenera el cliente → `npx prisma generate`
  con el backend detenido (error *"'campo' does not exist in type"*).
- Librería nueva en el panel (`react-markdown`): instalar con `pnpm add` antes de
  `npm run dev`; si queda "(stale)", borrar `.next`.
- `setNotificationHandler` (SDK 54) usa `shouldShowBanner`/`shouldShowList`.
- Un aviso puede quedar en **"enviando"** si el backend se cae justo a mitad
  del envío (no se reintenta, a propósito: mejor perder uno que duplicarlo).

## Pendientes arrastrados (consolidado, oct-2026)

- [x] Ojito "ver contraseña" en el **login de la app** (feria).
- [x] Ojito en el **panel web** (login) y en todo formulario con clave, incluido
  el cambio de contraseña al primer ingreso (8.7.a).
- [ ] **Socket.io no respeta la suplantación del superadmin** (GUIA § 21.7 y
  § 23.7). Se notó en la feria.
- [ ] 🐞 **El panel ya no se actualiza solo en la moderación en vivo** (reportado
  por Sebastián el 12-nov-2026): las preguntas nuevas y los resultados de las
  encuestas solo aparecen con F5. Antes funcionaba. **Sospecha:** si se entra
  como **superadmin** (suplantando a la organización), el socket del panel no
  logra unirse a la sala de la charla: desde el 8.7.b `join_sesion` aplica la
  regla de acceso, y el socket no conoce la suplantación (el pendiente de
  arriba). Primero comprobar si pasa también entrando como **organizador**; si
  no pasa, es este pendiente. Revisar en la Fase 9.
- [x] Validaciones de negocio de la agenda (**8.4**).
- [x] Fotos huérfanas en Storage al borrar un congreso entero (8.5).
- [ ] Campo **modalidad** del congreso (presencial / virtual / híbrido) para
  ajustar textos como el de la zona horaria (idea, sin prisa).
- [x] Elegir la `zona_horaria` al **crear** el congreso (8.4: el país la
  predefine con `datos/zonas.ts`).
- [x] Pantalla para **editar** un congreso existente (8.7.h, decisión 29:
  incluye estado, fechas con "correr la agenda" y zona solo sin sesiones).
- [ ] Que `e2e_onboarding_aislamiento.js` borre sus organizaciones al terminar.
- [ ] Límite de intentos por IP en `/auth/resolver-usuario` (**Fase 9**).
- [x] Pantallas móviles de login por usuario y cambio de contraseña al primer
  ingreso (8.7.a).
- [ ] `.gitattributes` para normalizar finales de línea.
- [ ] Suite de Jest (`clearMocksOnScope`).
- [x] **Tema por defecto** del congreso (`tema_default`) en la app (8.7.g).
- [x] "Patrocinado por…" en una charla, con varios sponsors (8.7.f).
- [ ] **Development build + prueba de push real** (EAS, `projectId`, Firebase
  FCM para Android). **Justo después del 8.7** (decisión 8.6).
- [ ] Avisos atascados en "enviando" si el backend se cae a mitad del envío
  (raro; se podría marcar como fallida tras X minutos). Fase 9.
- [x] (8.7.e: destino "⭐ Quienes la marcaron") Avisos "a los inscritos en una charla": hoy un aviso sobre una charla
  llega a todo el congreso (no existe "a qué charlas voy"). Si el 8.7 agrega
  "Mi agenda", se puede filtrar.
- [ ] ⚖️ **Texto de la política de datos** (`src/legal/politica-datos.ts`): es un
  borrador técnico; lo debe revisar y aprobar el cliente o su asesor legal antes
  de producción. Si cambia, subir `POLITICA_DATOS_VERSION`.
  **Revisado contra el Decreto 1377 de 2013, art. 13 (contenido mínimo)**
  (3-nov-2026). Cumple: tratamiento y finalidades, derechos, procedimiento
  general, lenguaje claro y aviso de cambios (versión). **Falta:**
  (a) datos del responsable: razón social, NIT, domicilio, dirección, correo y
  teléfono; (b) persona o área que atiende consultas y reclamos; (c) fecha de
  entrada en vigencia y vigencia de la base de datos; (d) enlace opcional a la
  política completa de la organización. Plan: campos de "datos legales" de la
  organización (editables en el panel) que se insertan en el texto. Va con el
  **8.7.c** junto con revocar/suprimir.
- [—] ⚖️ **Menores de edad** (documento `TI`): **descartado por ahora**
  (decisión de Sebastián, 3-nov-2026: no es necesario de momento). Si algún
  cliente lo requiere, la Ley 1581 exige la autorización del representante legal.
- [x] ⚖️ **Revocar autorización / pedir supresión** desde la app (8.7.c).
- [ ] ⚖️ Aceptación de la política para el **staff** en el panel web.
- [ ] 🤝 **Reunión con el cliente** para mostrarle panel y app (pendiente de
  fecha). Estar abiertos a TODOS los cambios que pida, de funcionamiento y de
  apariencia; anotarlos aquí como decisiones antes de tocar código.
- [ ] Recordatorio automático 10 min antes de las charlas con ⭐ (idea ofrecida
  en el 8.7.e, sin respuesta todavía).
- [ ] Actualizar ERD y C4 (`diagramas.html` y `NEXVIO_Vfinal.md`) al cerrar el
  Módulo 8.
- [ ] Actualizar el estado del proyecto en la documentación de la tesis (lo hace
  el equipo).

**SIGUIENTE EN DESARROLLO: Bloque 8.7 — App móvil completa.** El panel ya está
terminado; ahora la app refleja todo lo que el organizador configura. El diseño
base se hizo en la feria (§ 23). Lo que reúne este bloque (de los pendientes):

- **Login por usuario** y **cambio de contraseña al primer ingreso** (el backend
  ya está listo desde el 8.3), con ojito en ambos. De paso, el **ojito del
  login del panel web**.
- **Ver SOLO su congreso:** el asistente entra directo a su congreso (hoy ve una
  lista).
- **Perfil** del asistente (datos del `perfil_asistente` del 8.1, foto).
- **Networking mejorado.**
- **Reflejar el panel:** speakers (ya), sponsors (ya), personalización (ya) y
  el **tema por defecto** (`tema_default`), con selector claro/oscuro manual
  (NativeWind `darkMode: 'class'`) y fuentes con `expo-font`.
- Idea: "Patrocinado por…" en una charla.
- **Después del 8.7:** development build + prueba de push real.

---

## Estado actual (Fase 8 · Bloque 8.7 — App móvil completa) ✅ COMPLETO (6-nov-2026)

Sub-bloques 8.7.a → 8.7.j: entrada con usuario y primer ingreso (Ley 1581),
"solo su congreso" en el backend, perfil y derechos de datos, networking tipo
Tinder, Mi agenda, "Patrocinada por", tema claro/oscuro, pulido visual del
panel ("Violeta vivo"), pruebas del panel y rediseño de la app. Decisiones
**1 a 34** (abajo). Detalle técnico: GUIA § 27.

### Decisiones del 8.7 (tomadas con Sebastián, 30-oct-2026)

1. **Legal (Ley 1581):** al primer ingreso, junto al cambio de contraseña, el
   asistente **acepta el tratamiento de datos** (`acepto_datos_en`). Regla
   general: todo lo legal se cubre y se cumple.
2. **Ver solo su congreso:** inscrito en **uno** → entra directo y solo ve ese.
   Inscrito en **varios** (raro) → una pantalla para **elegir** cuál ver.
3. **Perfil editable por el asistente:** foto, cargo, empresa, teléfono y país.
   Nombre y documento NO (vienen del Excel de la organización). ⚠️ Si el
   cliente pide más campos, el diseño debe permitir sumarlos fácil.
4. **Networking mejorado:** las 4 ideas: (a) tarjetas con foto/cargo/empresa/
   bandera, (b) buscador y filtro por empresa o país, (c) interruptor "no
   aparecer en networking", (d) ver el perfil completo antes de mostrar
   interés. **Visualmente muy llamativo, con la foto como protagonista.**
5. **"Mi agenda" (charlas favoritas): sí.** Además permite enviar un aviso solo
   a quienes marcaron una charla.
6. **"Patrocinado por…" en una charla: sí, en este bloque** (campo nuevo +
   selector en la agenda del panel + se muestra en la app).

### Decisiones del 8.7.b (3-nov-2026)

7. **Seguridad ante todo** (Sebastián: "todo lo que podamos hacer para manejar
   bien la información es bien recibido"). El "solo su congreso" se hace
   cumplir en el **backend**, no solo ocultando botones en la app:
   - `AccesoCongresoGuard` + `@SoloInscritos(...)`: un asistente solo llega a
     las rutas de un congreso (y de sus sesiones y encuestas) si tiene una
     inscripción **confirmada** ahí. Si no, **404** (no 403: no se confirma
     que existe). El staff pasa (el RLS ya lo acota a su organización).
   - La sala en vivo de Socket.io (`join_sesion`) aplica la misma regla.
   - `GET /congresos` le devuelve al asistente solo los suyos.
   - **Se cerró la auto-inscripción**: el asistente ya no puede inscribirse
     ni darse de baja solo (403). Solo el staff inscribe (Excel o panel).
8. **Navegación: pestañas abajo + Perfil como menú de "todo lo demás"** (y no
   un menú lateral): lo diario a la vista y al alcance del pulgar; ajustes,
   privacidad, ayuda, cambiar de congreso y salir dentro de Perfil. Barra final:
   🏠 Congreso · 📅 Mi agenda (8.7.e) · 🤝 Networking (8.7.d) · 👤 Perfil.
9. **Menores de edad:** no se tienen en cuenta por ahora.

### Decisiones del 8.7.c (3-nov-2026)

10. **Foto de perfil:** cámara **y** galería, con recorte cuadrado antes de subir.
11. **Pedir supresión de datos:** la app **registra la solicitud**; el
    organizador la ve en el panel y la atiende (no se borra al instante: la
    organización puede tener deberes de conservar datos, p. ej. certificados).
12. **Datos legales de la organización** (razón social, NIT, dirección, correo,
    teléfono, área que atiende, enlace a su política): los editan **el
    organizador y el superadmin**. Se insertan en el texto de la política
    (cumple el art. 13 del Decreto 1377).
13. **Revocar la autorización** (confirmado): queda registrado cuándo revocó,
    desaparece del networking, se cierra la sesión y al volver a entrar se le
    pide aceptar de nuevo. (Revocar = "deja de usar mis datos", reversible;
    supresión = "bórralos", la atiende el organizador.)
14. El 8.7.c se divide: **c1** backend · **c2** panel · **c3** app.
15. **Ajustes tras probar el 8.7.c** (Sebastián, 3-nov):
    - El perfil suma una **descripción** (párrafo largo: qué hace, qué le
      gusta; máx. 500) y la **edad** opcional. La edad se guarda como **año de
      nacimiento** y no como fecha completa (minimización, Ley 1581): basta
      para mostrar "34 años". Como son datos nuevos que se muestran en el
      networking, la política sube a la **v3**.
    - El selector de congreso (inscrito en 2+) y la pantalla "sin congreso"
      deben mostrar las **pestañas de abajo** y **no** el botón de salir
      arriba (cerrar sesión vive en Perfil).
16. **Networking tipo Tinder (8.7.d):** foto grande como protagonista, nombre,
    edad, cargo/empresa y descripción; que sea llamativo. Más una **vista
    previa de "cómo me ven los demás"** desde el perfil. Diseño libre ("tú
    inventa, que quede chévere").
17. **Diseño del 8.7.d aprobado** (3-nov):
    - **Descubrir:** tarjeta grande por persona (foto a pantalla, degradado,
      nombre + edad, bandera, cargo · empresa, descripción). Deslizar derecha =
      "Me interesa", izquierda = "Ahora no" (sellos CONECTAR / PASAR), botones
      ✕ y 💜, tocar = perfil completo, pantalla "¡Es un match!" con las dos
      fotos. Sin foto: degradado con iniciales grandes. Los "Ahora no" se
      guardan (no vuelven a salir) y se pueden restablecer.
    - **Pestaña Networking:** Descubrir · Explorar (cuadrícula + buscador +
      filtro país/empresa) · Conexiones (matches y chats).
    - **Perfil:** solo "¿Cómo me ven?" (vista previa de la propia tarjeta, sin
      consejos) + interruptor "Aparecer en networking".
    - **Insignias:** PONENTE (dorada, con sus charlas), ORGANIZACIÓN,
      COORDINADOR. Un speaker se puede **vincular a una cuenta** de la app desde
      el panel; vinculado, aparece en Descubrir y se puede conectar. Sin cuenta,
      su tarjeta sale en Explorar → Ponentes con "Ver sus charlas".
    - Se divide en **d1** backend · **d2** panel · **d3** app.
    - **Commit:** uno solo al final del 8.7.d (no uno por sub-paso).
18. **Ajustes tras probar el 8.7.d** (3-nov): desde el chat se abre el perfil
    tocando la foto o el nombre; el logo del congreso ya no lleva marco blanco
    (se quitó el relleno del recuadro). Y **el match desbloquea más datos**:
    "Son conexión desde…", mensajes usados y, **solo si la otra persona activa
    "Compartir mi contacto"** (apagado por defecto), su WhatsApp, correo de
    contacto y LinkedIn. Interruptor y no mostrar por defecto porque la
    política decía que el teléfono no se mostraba: usarlo sin permiso sería una
    finalidad no autorizada. La política sube a la **v4**.
    **Consentimiento granular** (Sebastián, 3-nov): además del interruptor
    principal, cada dato (teléfono, correo, LinkedIn) tiene el suyo. Al
    encender el principal se encienden los tres; la persona apaga los que no
    quiera. Un dato apagado no sale del servidor.

### Diseño del 8.7.e — Mi agenda (4-nov)

19. ⭐ en cada charla (agenda del congreso y pantalla de la charla) y pestaña
    **📅 Mi agenda** (Congreso · Mi agenda · Networking · Perfil): lo urgente
    arriba (AHORA / PRÓXIMA · en 25 min), por día, aviso si dos marcadas se
    cruzan, las pasadas apagadas. Una sola memoria (MiAgendaContext) para que
    la ⭐ cambie igual en todas partes. Los breaks no se marcan.
    Panel: "⭐ 34" por charla (solo el número, nunca quiénes) y un tercer
    destino de aviso: **"Quienes la marcaron"** (a un asistente solo le sale en
    su bandeja si marcó esa charla). Tabla `sesion_favorita` con RLS; se suma a
    los borrados de sesión, congreso y supresión (lección del 8.5).

### Diseño del 8.7.f — Patrocinada por (4-nov)

20. ~~Un sponsor por charla~~ → **ajuste (Sebastián, 4-nov): uno, dos o los
    que quieran**, en el orden en que se eligen (tabla intermedia
    `sesion_sponsor`, como `sesion_ponente`; la migración copió lo ya
    asignado). Panel: selección múltiple con el número de orden. Además se
    arregló el menú de "⋯" que la tarjeta de la agenda recortaba: ahora se
    dibuja en un portal y se abre hacia arriba si no cabe.
    Original: **Un sponsor (opcional) por charla**, también en breaks ("Café patrocinado
    por…"). Solo sponsors de ESE congreso (400 si no). Si el sponsor se borra,
    la charla queda sin patrocinio (FK `ON DELETE SET NULL`). Panel: selector
    con logos en el formulario de la charla + "Patrocinada por" en la tarjeta.
    App: línea con logo en la agenda y en Mi agenda; franja "Esta charla es
    posible gracias a…" dentro de la charla (abre su web).

### Diseño del 8.7.g — Apariencia (4-nov)

21. **Panel → Apariencia:** el organizador elige el tema por defecto de su
    congreso (según el teléfono / claro / oscuro); la vista previa del celular
    se ve en claro u oscuro (y ya no muestra el viejo botón "Inscribirme").
    **App → Perfil → Ajustes → Apariencia:** cada persona elige **Por
    defecto** (lo del organizador) · **Claro** · **Oscuro** — ajuste de
    Sebastián (5-nov): se quitaron "Según mi teléfono" y el texto "El
    organizador eligió…"; la de la persona manda. Se guarda en el teléfono. Técnica: `TemaProvider` resuelve
    el modo y lo publica en `TemaCtx`; `useTema()` lo lee, así que ninguna
    pantalla tuvo que cambiar. El tema del congreso se recuerda en el teléfono
    para no "parpadear" al abrir. Las fuentes de marca ya estaban desde la
    feria (expo-font). Idea pendiente sin decidir: recordatorio automático 10
    min antes de las charlas con ⭐.

### Diseño del 8.7.h — Pulido visual del panel (5-nov)

22. **Mockup primero:** se hicieron dos variantes (A "Violeta vivo" y B
    "Noche Nexvio") de Panorama y Agenda, en claro y oscuro. **Sebastián
    eligió la A**; la B queda guardada como idea para una landing o algo que
    deba ser muy llamativo.
23. **Marco del panel:** menú lateral y barra superior SIEMPRE en el
    degradado violeta de marca con brillo coral (igual en claro y oscuro; solo
    cambia el contenido). Opciones del menú en cajitas translúcidas; la activa
    es una pastilla blanca. La barra muestra la organización (selector para el
    superadmin; el nombre de la suya para el organizador, vía `GET /auth/yo`,
    que ahora trae `organizacion.nombre`), el rol en un chip coral, tema y
    salir. En el celular el menú es un cajón que abre el ☰.
24. **Colores del contenido:** el claro deja el gris → fondo lavanda
    `#F4F2FF`, tarjetas blancas con borde `#E4DFFB`, texto secundario más
    oscuro `#55506E` (contraste AA) y sombra violeta tenue (se cambió
    `--shadow-sm`, así todas las tarjetas la toman sin tocar cada pantalla).
    Oscuro: `#0D0B18` / tarjetas `#17152A`.
25. **Espacio:** las pantallas usan `contenido-panel` (hasta 1600 px) en vez
    de `max-w-4xl/5xl`; listas en cuadrícula (congresos, speakers, sponsors,
    organizaciones, usuarios). Encabezado común con chip de ícono
    (`EncabezadoPagina` / `ChipTitulo`) y esqueleto de carga.
26. **Congresos y Panorama:** tarjetas con portada en degradado (los colores
    del congreso si los tiene), logo, estado, fechas, conteos y "Entrar".
    `GET /congresos` ahora incluye `personalizacion` (logo y colores) y
    `_count` (sesiones e inscritos confirmados). Panorama: 4 indicadores
    (en curso/próximo, congresos, inscritos, organizaciones), buscador y
    filtros; "Entrar" lleva directo a ese congreso.
27. **Agenda:** línea de tiempo con la hora a la izquierda; pausas de café en
    ámbar y almuerzo en verde (ícono + borde punteado), plenaria con franja
    coral, taller cian, charla violeta; "Patrocinada por" en franja coral; a
    la derecha el resumen del día, las más marcadas con ⭐ y los sponsors.

28. **Ajustes tras la primera prueba (5-nov):**
    - **Inicio del congreso** (`/congresos/:id`) ahora es su "portada": banner
      (imagen de Apariencia o sus colores) con velo oscuro, logo grande,
      datos, 6 accesos de colores (Agenda, Speakers, Sponsors, Asistentes,
      Notificaciones, Apariencia) con sus números, **Próximas sesiones** (un
      adelanto que enlaza a la agenda; ya NO hay dos agendas distintas) y
      ponentes + sponsors. `GET /congresos/:id` trae `_count.inscripciones`.
    - **Moderación en vivo** a todo el ancho: encabezado con la marca del
      congreso y la charla (hora, sala, ponentes, ⭐, sponsors, EN VIVO),
      indicador "Sincronizado en vivo", 4 indicadores, filtros de preguntas
      con conteo, tarjetas con foto/nombre/"hace X min", encuestas con la
      opción que va ganando resaltada. Nuevo `GET /sesiones/:id` (solo
      staff). Las preguntas traen apellidos y foto **solo para el staff**
      (al asistente le sigue llegando solo el nombre — minimización).
    - **Selector de congreso** (Agenda, Speakers, Sponsors, Notificaciones y
      Usuarios del menú) con las mismas tarjetas de portada, a todo el ancho.

29. **Editar un congreso (5-nov, caso real: "era 20–22 y al final también el
    23" / "ya no es el 20 sino el 23"):** botón "Editar datos y fechas" en la
    portada del congreso → cajón con nombre, **estado** (borrador / publicado
    / archivado — antes no había cómo publicar desde el panel), fechas, país,
    ciudad, zona, sede y descripción. Organizador y superadmin.
    Backend (`PATCH /congresos/:id`): fin ≥ inicio; si se mueve el inicio y
    llega `correr_sesiones: true`, TODAS las sesiones se corren los mismos
    días conservando la hora del reloj en la zona del evento; ninguna sesión
    puede quedar en un día fuera del congreso (409 con los días); la zona no
    se puede cambiar si ya hay sesiones (409). Todo en una transacción.
    **Probado en el 8.7.i** (`e2e_fase8_7h_panel.js`), incluido un congreso
    en New York cuya agenda se corre cruzando el fin del horario de verano.

### Plan del 8.7

- ✅ **8.7.a** Entrada: login por usuario, primer ingreso (nueva contraseña +
  aceptar datos), ojito en la app y en el login del panel.
- ✅ **8.7.b** "Mi congreso": directo si es uno; selector si son varios.
- ✅ **8.7.c** Perfil: ver y editar (foto incluida).
- ✅ **8.7.d** Networking llamativo (las 4 ideas).
- ✅ **8.7.e** Mi agenda + avisos "a quienes marcaron la charla".
- ✅ **8.7.f** "Patrocinado por…" (backend + panel + app).
- ✅ **8.7.g** Tema por defecto + selector claro/oscuro + fuentes.
- ✅ **8.7.h** Pulido visual del panel web — variante A "Violeta vivo"
  (decisiones 22–27). Un solo commit junto con 8.7.f y 8.7.g.
- ✅ **8.7.i** Pruebas + documentación (GUIA § 27) + cierre del bloque.
- ✅ **8.7.j** Rediseño visual de la APP alineado con el panel "Violeta vivo"
  (decisiones 31–34): j1 base (paleta, cabecera con brillo, barra flotante) ·
  j2 pantallas (Congreso con cabecera plegable, Mi agenda, Networking,
  Perfil, Entrar, Primer ingreso) · j3 marca nativa (ícono, splash nativo y
  splash animado, nombre "Nexvio", paquete `com.nexvio.app`) · j4 vista
  previa del panel · j5 documentación (GUIA § 27.11–27.13). Además: eliminar
  conexión (decisión 34) con su prueba `e2e_fase8_7j_conexion.js`.

**✅ BLOQUE 8.7 COMPLETO (6-nov-2026)** — reabierto el 5-nov por la decisión
31 y cerrado de nuevo con el 8.7.j.

### Decisión 30 — La reunión con el cliente va al FINAL (5-nov-2026)

Sebastián: *"es preferible hacer el resto y que nos den el feedback de todo de
una vez, no hacer después otra reunión"*. Nuevo orden:

1. **Bloque 8.8 — Development build + push real** (EAS + FCM, Android).
2. **Fase 9** — pruebas, carga, seguridad, Ley 1581.
3. **Fase 7** — WhatsApp + IA (antes estaba condicionada a que el cliente
   aprobara el sistema; ahora se construye antes de la reunión).
4. **Reunión con el cliente** con TODO terminado → los cambios que pida se
   anotan como decisiones y se aplican; luego se repiten las pruebas e2e
   (ya existen para cada bloque) y la verificación de la Fase 9 que aplique.

### Decisión 31 — Falta el rediseño de la APP (5-nov-2026, noche)

Sebastián notó que el 8.7 no incluyó un rediseño de la app como el 8.7.h del
panel. Revisado: la app conserva la paleta de la **feria** (gris `#F5F6FA`,
bordes `#ECEDF3`, texto secundario `#6B7385`) mientras el panel pasó a
"Violeta vivo" (lavanda `#F4F2FF`, `#E4DFFB`, `#55506E` con contraste AA,
marco en degradado violeta): parecen dos productos distintos. Se agrega el
**8.7.j** y va **antes del build** (8.8): el ícono, el splash y lo nativo
viven en la app compilada, así se compila una sola vez. Mismo método que el
panel: **mockup primero** y Sebastián elige. Quedan para después: ¿recordatorio
10 min antes de charlas con ⭐? (sin decidir), política para el staff y
Socket.io con suplantación (Fase 9), ERD/C4 al cerrar el Módulo 8.
Paquete Android acordado para el 8.8: **`com.nexvio.app`** (cuenta Expo
`duran1508`; Firebase con proyecto nuevo, aparte de VitalSync).

### Decisión 32 — Mockup de la app aprobado (6-nov-2026)

Lienzo "Nexvio · Rediseño de la app" (claude.ai): Splash, Entrar, Congreso,
Mi agenda, Networking y Perfil en claro y oscuro + ícono. **Aprobado sin
cambios:**
- Paleta del panel: lavanda `#F4F2FF`, tarjetas blancas con borde `#E4DFFB`,
  texto `#1B1638` / secundario `#55506E`, sombra violeta; oscuro `#0D0B18` /
  `#17152A` / borde `#2A2645` / secundario `#B9B5CC`.
- Cabecera con degradado de marca (`#2E1A8C → #4A35D6 → #5A46F0`) y brillo
  coral, bordes inferiores redondeados.
- **Barra de pestañas violeta flotante** (Sebastián: "me encanta"), activa =
  pastilla blanca; igual en claro y oscuro.
- **Splash animado** (nodos que aparecen, línea que se dibuja, nodo coral que
  late, tres puntos de carga) — "perfecto".
- Ícono: N blanca con nodo coral sobre el degradado.
- **Cuidar todo lo de personalización** (pedido de Sebastián): colores del
  congreso en cabecera/botones, banner y logo, y que las fotos de las personas
  se vean bien. Con colores propios, la cabecera usa los del congreso.
- **Panel → Apariencia:** la vista previa del celular se actualiza al diseño
  nuevo (es parte del 8.7.j).

### Decisión 33 — Ajustes tras probar la base del 8.7.j (6-nov-2026)

- **Brillo de la esquina con colores propios = el MISMO principal, 45 % más
  claro** (no el secundario). El brillo es semitransparente y se mezcla con
  el fondo: naranja + secundario verde azulado daba un verde barroso. El
  coral queda solo para Nexvio; el secundario sigue en EN CURSO, NUEVO, etc.
- **Panel → Apariencia: el botón "Usar la de Nexvio" → "Colores de Nexvio"**
  y reinicia SOLO los colores (antes también quitaba logo y portada).
- La vista previa del celular en el panel (j4) debe mostrar el degradado de
  3 tonos y el brillo, no un solo color.

### Decisión 34 — Eliminar una conexión (6-nov-2026)

- Sebastián: se debe poder "revocar el match", con un botón pequeño y poco
  visible. Útil para probar el match sin crear perfiles nuevos, y además
  normal en estas apps y coherente con la Ley 1581 (la persona controla quién
  ve su contacto).
- **Opción A elegida:** al eliminarla, las dos personas **vuelven a
  aparecerse en Descubrir** como si nunca se hubieran visto (se borran el
  chat, la conexión y los "Me interesa" de ambos). Si el cliente pide un
  "Bloquear" (que no se vuelvan a ver), se agrega aparte.
- `DELETE /conexiones/:id`: solo las dos personas de la conexión (las demás,
  404). Sin migración. Enlace gris "Eliminar conexión" en el perfil de la
  persona, con confirmación.
- De paso: "Son conexión" → "¡Ya están conectados!".

---

## Estado actual (Fase 8 · Bloque 8.8 — Idiomas) ✅ COMPLETO (7-nov-2026)

La app en español, inglés y portugués (Brasil): idioma del teléfono o el que
elija la persona, ~360 textos por idioma, fechas según el idioma, diálogos
propios con la marca, errores del backend y política de datos traducidos
(cabecera `X-Idioma`). Decisiones **35 y 36**. Prueba
`e2e_fase8_8_idiomas.js` 16/16. Detalle técnico: GUIA § 28.

### Decisión 35 — La app en ESPAÑOL, INGLÉS y PORTUGUÉS (6-nov-2026)

Sebastián: los congresos son internacionales; "como MÍNIMO inglés", y
portugués porque a Bogotá vienen muchos brasileños.
1. **Solo la app** por ahora (la usan los asistentes internacionales). El
   panel web queda en español; se puede hacer después.
2. **Idioma = el del teléfono**; quien quiera lo cambia en Perfil → Ajustes →
   Idioma (Por defecto · Español · English · Português), guardado en el
   teléfono como el tema. Si el teléfono está en otro idioma → inglés.
   **No** hay idioma por defecto elegido por el organizador.
3. **es / en / pt-BR.**
- Se traducen: textos de la app, fechas y horas (hoy fijos en 'es-CO'),
  errores que ve el asistente y la **política de datos** (en/pt con nota de
  que prevalece la versión en español — ley colombiana; ~~sube la versión~~
  → **corregido en la decisión 36: NO se sube**).
- **No** se traduce lo que escribe el organizador (charlas, avisos…).
- Técnica: `i18next` + `react-i18next` + `expo-localization` (nativa →
  instalar ANTES del development build).
- **Cronograma:** nuevo **Bloque 8.8 — Idiomas**; el build pasa al **8.9**.

Mismo método de siempre.

---

### Decisión 36 — Cómo se tradujo el backend (7-nov-2026)

1. **Cabecera propia `X-Idioma`**, no `Accept-Language`: los navegadores
   mandan `Accept-Language` solos y el panel (que es solo en español) habría
   empezado a recibir errores en inglés. Solo la app manda `X-Idioma`.
2. **Errores:** los servicios siguen en español; un filtro global los
   traduce con una lista de los mensajes que ve el ASISTENTE
   (`src/idioma/mensajes.ts`). Lo que no está en la lista sale en español.
3. **Política de datos:** en/pt + sección 8 "prevalece la versión en
   español". **La versión NO se sube** (sigue `2026-11-v4`): traducir no es
   un cambio sustancial (Decreto 1377, art. 13) y subirla obligaría a todos
   a aceptar de nuevo. Corrige el punto de la decisión 35. Si el asesor legal
   del cliente opina distinto, se sube en `politica-datos.ts`.
4. **Pendiente antes de la reunión con el cliente:** que un hablante nativo
   revise el inglés y el portugués (sobre todo la política).
5. Pendiente menor: nombres de países en en/pt (Hermes no trae
   `Intl.DisplayNames`).

---

### Decisión 37 — La reunión con el cliente va ANTES del build (7-nov-2026)

Cambia el orden de la decisión 30. Sebastián tiene la reunión hoy (7-nov,
tarde), con el 8.8 ya en el commit. Lo que pida el cliente se hace como
**Bloque 8.10 — Ajustes del cliente** y **después** viene el build (8.9):
así se compila e instala una sola vez con todo pulido.
- En la reunión, la app se muestra en **Expo Go** (todo funciona menos la
  notificación push en el teléfono: esa llega con el build).
- La revisión nativa del en/pt (decisión 36) queda para antes de producción.

---

## Bloque 8.10 — Ajustes del cliente (reunión del 7-nov-2026)

La reunión salió bien. Pedidos del cliente, en el orden en que se hacen:

### Decisión 38 — Título de la pestaña del panel: solo "Nexvio" (7-nov)
Antes: "Nexvio — Panel".

### Decisión 39 — Preguntas PRIVADAS y sin "aprobar" (7-nov)
Cambia el "muro público" de la Fase 5.
- Cada asistente ve **solo sus propias preguntas**, con su estado, desde el
  momento en que la envía. Nadie más las ve (el staff sí, todas).
- **Se quita el paso de "Aprobar"** (el cliente: "es redundante, igual nadie
  más las va a ver"). El staff solo las **marca respondidas**.
- Flujo: **pendiente → respondida**. Se conserva "descartar" (`rechazada`)
  para spam o repetidas. Las que quedaron `aprobada` de antes se tratan como
  pendientes.

### Decisión 40 — Cambiar de congreso desde el Perfil, sin salir (7-nov)
- Al abrir la app con 2+ congresos: **igual que hoy** (la lista la primera vez;
  luego recuerda el último).
- En el **Perfil**: en vez de "congreso actual + Cambiar de congreso", aparecen
  **directamente todos sus congresos**; toca uno y queda elegido **sin salir
  del Perfil** (no vuelve a la primera pestaña).

### Decisión 41 — Nombres unificados entre panel y app (7-nov)
| Concepto | Antes en el panel | Queda |
|---|---|---|
| Quien da la charla | Speakers | **Ponentes** |
| Empresa que apoya | Sponsors | **Patrocinadores** |
| Persona inscrita | Usuarios | **Asistentes** |
| Actividad de la agenda | Sesiones | **Charlas** |
| Mensaje del organizador | Notificaciones | **Notificaciones** (se queda: es más claro para un organizador que no conoce el sistema; la app sigue diciendo "Avisos") |

Solo cambian los textos visibles; las rutas (`/speakers`) y el código no.

### Pedido 5 — Textos que edita Sebastián a mano
Después de la decisión 41 (para no pisarse). Mapa de archivos en GUIA § 28.

---

## Estado actual (Fase 8 · Bloque 8.9 — Development build + push real) ✅ COMPLETO (12-nov-2026)

La app se compila con EAS como app propia (`com.nexvio.app`, perfil
`development`, APK) y recibe notificaciones push reales por Firebase (FCM V1,
proyecto `nexvio-97c5f`). Prueba de cierre manual en Android: ✅. Detalle,
comandos y gotchas: GUIA § 30.

### Decisiones del 8.9 (12-nov-2026)
42. **Firebase aparte del de VitalSync** (proyecto nuevo `nexvio-97c5f`).
43. **Ningún archivo de Firebase en git:** `google-services.json` va a EAS como
    variable de entorno tipo archivo (`GOOGLE_SERVICES_JSON`, secreta) y
    `app.config.js` lee su ruta; la clave de la cuenta de servicio vive solo en
    las credenciales de EAS.
44. **Node 22.13 en los builds de EAS** (perfil `base`), porque pnpm 11 lo exige.
45. **Reanimated 4.1.7 + Worklets 0.5.1 declarados** en la app (los del SDK 54),
    para que NativeWind no arrastre una versión incompatible.
46. **iOS queda como trabajo futuro** (cuenta de Apple de pago o Mac). Además,
    Expo Go en iPhone solo abre la SDK más reciente (58) y Nexvio está en la
    54: probar en iOS exige actualizar la SDK o la cuenta de Apple. Actualizar
    la SDK (54 → 58) se deja para antes de publicar en tiendas.

**Pendiente para la Fase 9:** la app compilada todavía depende de la PC (Metro
+ backend local). Para un build que funcione solo: backend desplegado y
`EXPO_PUBLIC_API_URL` en `lib/config.ts`.

---

## 📍 PUNTO DE RETOMA (12-nov-2026, noche) — Bloque 8.9 cerrado ✅

**Hecho:** 8.10 (ajustes del cliente, con el fix de cambio de congreso) y 8.9
(development build + push real). **Fase 8 completa.**

**Commit pendiente (lo hace Sebastián):**
```
docs(8.9): development build y push real — GUIA § 30, decisiones 42–46 y cierre de la Fase 8
```

**SIGUIENTE (en este orden):**
1. **Fase 9** — pruebas de carga, revisión OWASP, límite de intentos en el
   login por usuario, el panel que no se actualiza solo en la moderación,
   aceptación de la política por el staff, despliegue (backend + panel) y
   `EXPO_PUBLIC_API_URL` para builds que funcionen sin la PC.
2. **Próximo semestre:** **Fase 7** (WhatsApp + agente IA) y **Fase 10**
   (landing page comercial, decisión 47). Este semestre cierra con la Fase 9.

### Decisión 48 — Pruebas de carga con 700–900 asistentes (12-nov-2026)

Sebastián: los congresos objetivo son grandes; el plan original decía 120+
usuarios, pero hay que asegurar que el sistema no se cuelgue en un evento
importante. **Meta: 900 asistentes simultáneos** (con un pico de prueba de
~1.000 para tener margen). Criterios y escenarios: ver el plan del 9.1 en
la GUIA cuando se construya.

### Hallazgo 9.1-1 — La importación de Excel es lenta con volumen (12-nov-2026)

Al preparar la prueba de carga se importaron **900 asistentes en 6 lotes de
150: 900/900 sin errores, pero 845,7 s en total (~940 ms por persona)**. Causa:
`importacion.service.ts` crea las cuentas **en serie** (por persona: crear la
cuenta en Supabase Auth, que además cifra la clave, y luego la transacción en
la base). Consecuencia: un Excel de 900 subido desde el panel tardaría ~14 min
en UNA petición → la cortaría el servidor (Node corta a los 5 min; los hosts de
producción, antes). En el panel, un archivo de ~300 personas ya está en riesgo.
**Tarea 9.11:** crear las cuentas con concurrencia limitada (p. ej. 8 a la vez)
y, mejor, importar en segundo plano con progreso ("340 de 900…"). Medir de
nuevo después del arreglo (evidencia antes/después para la tesis).

### Hallazgo 9.1-2 — El límite de inicios de sesión de Supabase es POR IP (13-nov-2026)

Sacar 900 tokens desde un solo PC tardó ~29 min (900/900, con pausas por 429),
aun con el límite subido. Supabase limita los inicios de sesión **por IP**.
Con usuarios reales cada teléfono tiene su IP, **salvo en el Wi-Fi del
evento**: ahí cientos de teléfonos salen a internet con la MISMA IP pública y,
si muchos entran a la vez (p. ej. al abrir el congreso), el límite los
bloquearía. **Tarea 9.12:** dejar el límite de "Sign-ups and sign-ins" alto en
producción (no volver a 30) y comprobar que la app muestre un mensaje claro si
le toca un 429. (La sesión de la app se recuerda: cada persona inicia sesión
una sola vez, no cada vez que abre la app.)

⚠️ Ajustes TEMPORALES de las pruebas, a revertir al terminar la Fase 9: vida
del token (JWT expiry) volver a 3600; el límite de sign-ins dejarlo en un valor
de producción decidido en la 9.12.

### Hallazgo 9.1-3 — Ensayo local: estable pero lento (13-nov-2026)

Ensayo en el PC de Sebastián (backend local, base en Supabase us-east-2):

| Escenario | VUs | Errores | p95 | mín | req/s |
|---|---|---|---|---|---|
| A · llegada | 100 | 0 % | 3,1 s | 407 ms | 12,9 |
| B · charla estrella | 200 | 0 % | 21,4 s | 711 ms | 8,9 |
| C · pico | 100 | 0 % | 2,8 s | 437 ms | 16,2 |

- **Estable:** 0 % de errores; en B las 200 conexiones en vivo entraron a la sala.
- **Lento por latencia:** cada ida y vuelta Bogotá→Ohio ≈ 120 ms y cada
  petición hace ~10 (transacción del `AccesoCongresoGuard` + transacción del
  servicio, cada una con BEGIN/set_config/consultas/COMMIT). Con el pool de
  15 conexiones, el techo es ~13 req/s: lo que midió k6.
- En B la avalancha de refrescos ("avisar y refrescar") **no alcanzó a darse**
  (181 avisos de ~40.000 posibles): la fila llegó primero. Hay que volver a
  medirla con el sistema desplegado.
- **Plan:** 9.7 (desplegar el backend en la región de Supabase) → repetir
  ensayos → **9.13** optimizaciones (una sola transacción por petición, pool
  más grande, agrupar avisos en vivo o enviar el resultado en el aviso) →
  medición oficial con 900. Reportes del ensayo: `prisma/carga/reportes/`.

### 9.7 — Despliegue ✅ (13-nov-2026)

- **Backend:** Render, región **Ohio** (la misma de Supabase), plan free →
  `https://nexvio-backend.onrender.com`. Configuración en `render.yaml`
  (Blueprint). Secretos solo en el panel de Render.
- **Panel:** Vercel (Hobby, gratis) → `https://nexvio-rose.vercel.app`. Root
  Directory `apps/web`; Install Command propio (abajo).
- `WEB_ORIGIN` (Render) = `https://nexvio-rose.vercel.app,http://localhost:3001`
  (CORS y Socket.io aceptan varios orígenes separados por coma).
- **Gotchas:** (1) `start:prod` apuntaba a `dist/main` y el build deja
  `dist/src/main` (nunca se notó porque en local se usa `start:dev`);
  (2) `corepack enable` falla en Node 22.13 ("Cannot find matching keyid":
  llaves nuevas de npm) → se instala pnpm con `npm install -g pnpm@11.17.0`
  en Render y en Vercel; (3) el plan free de Render se duerme a los 15 min
  (~1 min en despertar): para la medición oficial de 900 se sube a un plan
  pago unos días.
- ⚠️ Las claves de la base quedaron visibles en un pantallazo (13-nov): **se
  rotaron** las de `postgres` y `nexvio_app` (`.env` local y Render al día).

### Hallazgo 9.1-4 — Ensayo contra Render (free, Ohio) (13-nov-2026)

| Escenario | VUs | Errores | p95 local → Render | Criterio |
|---|---|---|---|---|
| A · llegada | 100 | 0 % | 3,1 s → **0,67 s** (prom. 0,28 s) | ✅ |
| B · charla estrella* | 200 | 0 % | 21,4 s → **16,4 s** (unirse a la sala ~5 s) | ✗ |
| C · pico | 100 | 0 % | 2,8 s → **1,5 s** | ✗ (cerca) |

\* B corrido de nuevo con una encuesta NUEVA por corrida: la primera vez dio
199 "409 Ya votaste" porque se reusaron la encuesta y los asistentes del
ensayo local (error del script, no del sistema; ya corregido).
Conclusión: estar junto a la base resolvió la navegación normal (A). Lo que
falta es el **tiempo real** (B) y los **picos** (C): CPU mínima del plan free +
dos transacciones por petición + la avalancha de refrescos (626–773 avisos ya
en 200 usuarios).

### 9.13 ✅ Rendimiento (13-nov-2026)
Portero con memoria + una transacción; avisos de preguntas solo al autor y al
staff; avisos de encuestas agrupados (1/s) con los resultados. En Render free:
**C pasa (p95 0,53 s)**; B con 0 % errores y sin avalancha (4.600 avisos con
resultados), latencia restante por CPU del plan gratis → se valida en la
medición oficial. Detalle: `PRUEBAS_NEXVIO.md` § 5.10. El panel como
superadmin sigue sin actualizarse solo (confirmado: es la 9.4).

### Plan ordenado del resto de la Fase 9 (13-nov-2026)
1. ✅ **9.13** Rendimiento: una transacción por petición, avisos en vivo
   agrupados, pool → re-medir B y C en Render free (antes/después).
2. **9.11** Importación de Excel rápida (concurrencia / en segundo plano).
3. **9.4 + 9.5** Correcciones: panel en vivo como superadmin; avisos atascados.
4. **9.3 + 9.12** Seguridad del login: límite de intentos + límite de
   Supabase para el Wi-Fi del evento y mensaje claro en la app.
5. **9.6** Política de datos para el staff.
6. **9.2** Revisión OWASP Top 10 (con el código ya corregido).
7. **9.1** Medición oficial con 900 (Render pago unos días).
8. **9.8** Build `preview` de la app (funciona sin la PC).
9. **9.9** Todas las pruebas finales + revertir ajustes temporales (JWT
   expiry, plan de Render) + limpiar los datos de carga + GUIA § 31.
10. *(opcional)* 9.10 pendientes menores.

### Decisión 47 — Landing page comercial de Nexvio (12-nov-2026, para el próximo semestre)

Salió de la reunión con el cliente del 7-nov. Hace falta una **página pública**
que cumpla dos funciones:
1. **Vender el producto (lo central):** qué es Nexvio, sus características
   (panel, app, en vivo, networking, multi-organización, Ley 1581, idiomas),
   beneficios para el organizador y llamado a la acción ("Solicitar demo" /
   contacto). Debe ser **muy llamativa**: animaciones, imágenes flotantes
   (capturas del panel y de la app), transiciones al hacer scroll.
2. **Puerta de entrada del staff:** un botón **"Ingresar al panel"** que lleve
   al login del panel web.

Notas técnicas para cuando se haga:
- Puede vivir en el mismo Next.js del panel (la raíz `/` como landing y
  `/login` como hoy) o en un sitio aparte; decidirlo al arrancar.
- Depende del **despliegue** (9.7): necesita el panel publicado y, idealmente,
  un dominio propio.
- Idea ya guardada: la variante **B "Noche Nexvio"** del mockup del 8.7.h
  (decisión 22) se reservó justamente "para una landing o algo que deba ser
  muy llamativo".
- **Mockup primero** (como en el 8.7.h y el 8.7.j) y aprobación antes de
  programar.

**Método (no cambia):** paso a paso y explicado; Sebastián hace los commits;
cada bloque cierra con prueba; GUIA_DEV y HANDOFF se actualizan al cerrar y
las decisiones se anotan al tomarlas; verificar SIEMPRE los archivos tras
copiarlos al PC; correr `npx tsc --noEmit` tras cada cambio grande de la app.
Credenciales nunca en el repo. Textos de la app: cambiar los TRES diccionarios.

---

## (Histórico) PUNTO DE RETOMA (12-nov-2026) — Bloque 8.10 (ajustes del cliente) cerrado ✅

**Hecho (8.10):** decisiones 38–41 — título "Nexvio", preguntas privadas y
sin aprobar, cambiar de congreso desde el Perfil, nombres unificados (panel =
app). Script `26_ajustes_cliente.sql` aplicado. Pruebas en verde:
`e2e_fase8_10_preguntas.js` (nueva), `e2e_fase8_7h_panel.js` y
`e2e_fase5_preguntas.js` (actualizadas). Detalle: GUIA § 29.

**Además, en el mismo commit:** documentación para la tesis
(`RESUMEN_PARA_DOCUMENTACION.md`, inicio de la GUIA y del HANDOFF al día,
`metodologia-anexo-resultados.md` actualizado al 90 % y
`medicion-avance-nexvio.md`), `rls_via_app.js` corregido y un error anotado
(el panel no se actualiza solo en la moderación; ver pendientes).

**Commit pendiente (lo hace Sebastián):**
```
feat(8.10): ajustes del cliente — preguntas privadas sin aprobar, nombres unificados con la app, cambio de congreso desde el Perfil; docs para la tesis y fix de rls_via_app
```

**Pendiente menor del 8.10:** los textos que Sebastián cambia a mano (pedido 5),
cuando él quiera (mapa de archivos en GUIA § 28).

**SIGUIENTE (en este orden):**
1. **Bloque 8.9 — Development build con EAS + FCM + prueba de push real**
   (paquete `com.nexvio.app`, cuenta Expo `duran1508`, Firebase con
   proyecto nuevo, aparte del de VitalSync).
2. **Fase 9** (carga, OWASP, límite de intentos en el login, el panel que no
   se actualiza solo, despliegue).
3. **Fase 7** (WhatsApp + IA).

**Método (no cambia):** paso a paso y explicado; Sebastián hace los commits;
cada bloque cierra con prueba; GUIA_DEV y HANDOFF se actualizan al cerrar y
las decisiones se anotan al tomarlas; verificar SIEMPRE los archivos tras
copiarlos al PC; correr `npx tsc --noEmit` tras cada cambio grande de la app.
Credenciales nunca en el repo. Textos de la app: cambiar los TRES diccionarios.

---

## (Histórico) PUNTO DE RETOMA (7-nov-2026) — Bloque 8.8 (Idiomas) cerrado ✅

**Hecho (8.8):** la app en español, inglés y portugués (Brasil) —
decisiones 35 y 36. Detalle técnico en GUIA § 28.
- 8.8.a: i18next + `expo-localization`, idioma del teléfono o el elegido en
  Perfil → Idioma; fechas con `locale()`.
- 8.8.b: todas las pantallas traducidas (~360 textos por idioma) y el
  diálogo propio `Dialogo` en vez del `Alert.alert` gris de Android.
- 8.8.c: errores del backend y política de datos en el idioma de la app
  (`X-Idioma`). Prueba `e2e_fase8_8_idiomas.js`: **16/16**.

**Commit pendiente (lo hace Sebastián):**
```
feat(8.8): la app en español, inglés y portugués — i18next, selector de idioma, diálogos con la marca, errores y política de datos traducidos (X-Idioma)
```

**SIGUIENTE (en este orden; decisión 37 cambió el orden):**
0. **Reunión con el cliente (7-nov, tarde)** → sus cambios = **Bloque 8.10
   — Ajustes del cliente**, que se hace ANTES del build.
1. **Bloque 8.9 — Development build con EAS + FCM + prueba de push real**
   (paquete `com.nexvio.app`, cuenta Expo `duran1508`, Firebase con
   proyecto nuevo, aparte del de VitalSync). Ahí se verán el ícono y el
   splash nativo por primera vez.
2. **Fase 9** (pruebas, carga, seguridad, Ley 1581).
3. **Fase 7** (WhatsApp + IA).
4. **Reunión con el cliente** con todo terminado (antes: revisión nativa del
   en/pt).

**Método (no cambia):** paso a paso y explicado; Sebastián hace los commits;
cada bloque cierra con prueba; GUIA_DEV y HANDOFF se actualizan al cerrar y
las decisiones se anotan al tomarlas; verificar SIEMPRE los archivos tras
copiarlos al PC; correr `npx tsc --noEmit` tras cada cambio grande de la app.
Credenciales nunca en el repo. **Textos: cambiar los TRES diccionarios.**

---

## (Histórico) PUNTO DE RETOMA (6-nov-2026, tarde) — Bloque 8.7 cerrado (con el 8.7.j)

**Hecho:** 8.7.a → 8.7.j. El 8.7.j rediseñó la app (decisiones 31–34) y
agregó "Eliminar conexión". Detalle técnico en GUIA § 27.11–27.13.

**Commit pendiente (lo hace Sebastián; el del 8.7.i ya está: `213b3cc`):**
```
feat(8.7.j): rediseño de la app "Violeta vivo" — barra flotante, cabecera plegable, Mi agenda, Networking y Perfil nuevos, splash animado e ícono, vista previa del panel, eliminar conexión
```

**SIGUIENTE (en este orden, decisiones 30 y 35):**
1. **Bloque 8.8 — Idiomas (es / en / pt-BR) en la app** (decisión 35).
2. **Bloque 8.9 — Development build con EAS + FCM + prueba de push real**
   (paquete `com.nexvio.app`, cuenta Expo `duran1508`, Firebase con
   proyecto nuevo). Ahí se verán el ícono y el splash nativo por primera vez.
3. **Fase 9** (pruebas, carga, seguridad, Ley 1581).
4. **Fase 7** (WhatsApp + IA).
5. **Reunión con el cliente** con todo terminado.

**Método (no cambia):** paso a paso y explicado; Sebastián hace los commits;
cada bloque cierra con prueba; GUIA_DEV y HANDOFF se actualizan al cerrar y
las decisiones se anotan al tomarlas; verificar SIEMPRE los archivos tras
copiarlos al PC; correr `npx tsc --noEmit` tras cada cambio grande de la app.
Credenciales nunca en el repo.

---

## (Histórico) PUNTO DE RETOMA (5-nov-2026, noche) — Bloque 8.7 cerrado

**Hecho:** 8.7.a → 8.7.i completos. El 8.7.i dejó:
- `prisma/tests/e2e_fase8_7h_panel.js` (**33 verificaciones**): editar congreso
  (fin ≥ inicio; alargar no toca la agenda; mover el inicio sin correr → 409
  sin cambiar nada; con `correr_sesiones` se mueve a la misma hora del reloj;
  acortar dejando sesiones fuera → 409; zona con sesiones → 409; zona
  inválida/estado inválido/campo extra → 400; asistente → 403), correr la
  agenda en New York cruzando el fin del horario de verano, `GET /sesiones/:id`
  (staff 200 / asistente 403 / 404 / 401), preguntas con apellidos y foto solo
  para el staff, y `_count` + `personalizacion` en `/congresos`.
- Corridas de regresión: todas las pruebas del 8.7 (a–h) **en verde**.
- GUIA_DEV: **§ 27** (todo el bloque + gotchas), comandos en la § 11 y nota
  nueva en el encabezado.

**Commit pendiente (lo hace Sebastián):**

```
test(8.7.i): pruebas e2e del panel (editar congreso, moderación, _count) + GUIA § 27 y cierre del Bloque 8.7
```

**SIGUIENTE (en este orden, decisión 30):**
0. **8.7.j — Rediseño visual de la app** (decisión 31), luego cerrar el 8.7.
1. **Bloque 8.8 — Development build con EAS + FCM + prueba de push real**
   (pendiente desde el 8.6, GUIA § 26.1). Paquete `com.nexvio.app`.
2. **Fase 9** (pruebas, carga, seguridad, Ley 1581).
3. **Fase 7** (WhatsApp + IA).
4. **Reunión con el cliente** con todo terminado: abiertos a todos los cambios
   que pida (funcionamiento y apariencia); se anotan aquí como decisiones.

**Método (no cambia):** paso a paso y explicado; Sebastián hace los commits;
cada bloque cierra con prueba; GUIA_DEV y HANDOFF se actualizan al cerrar y
las decisiones se anotan aquí al tomarlas; verificar SIEMPRE los archivos tras
copiarlos al PC. Credenciales nunca en el repo.

---

## (Histórico) PUNTO DE RETOMA (5-nov-2026, tarde) — traspaso a chat nuevo

**Hecho:** 8.7.a → 8.7.h completos. a–d con commit propio; **f + g + h van en
UN solo commit** (lo hace Sebastián al cerrar este chat):

```
feat(8.7.f-h): varios sponsors por charla, tema claro/oscuro en la app, rediseño visual del panel (Violeta vivo), portada del congreso, moderación en vivo y edición de congresos
```

**Lo del 8.7.h en una línea por pieza** (detalle en decisiones 22–29):
- Marco del panel siempre violeta (`fondo-marca-lateral`/`fondo-marca-barra`
  en `globals.css`), menú con cajitas y activa en blanco, ☰ en celular.
- Tokens nuevos (lavanda `#F4F2FF`, texto secundario `#55506E`, sombra
  violeta vía `--shadow-sm`); `contenido-panel` (1600 px) en todas las
  pantallas; `EncabezadoPagina`/`ChipTitulo`/`EsqueletoPagina`
  (`components/panel/encabezado-pagina.tsx`).
- `TarjetaCongreso` (`components/panel/tarjeta-congreso.tsx`) en Congresos,
  Panorama y el selector de congreso (`elegir-congreso.tsx`, ahora con prop
  `Icono`; Usuarios también lo usa).
- Agenda: línea de tiempo, pausas ámbar/verde, resumen del día.
- Portada del congreso (`/congresos/:id`): banner + logo de Apariencia,
  accesos de colores, "Próximas sesiones" (adelanto; la agenda es UNA).
- Moderación en vivo rediseñada (`/sesiones/:id`).
- Editar congreso (`components/panel/editar-congreso.tsx`).
- Backend: `GET /auth/yo` trae `organizacion.nombre`; `GET /congresos` trae
  `personalizacion` + `_count`; `GET /congresos/:id` trae
  `_count.inscripciones`; nuevo `GET /sesiones/:id` (staff); preguntas con
  apellidos/foto solo para staff; `PATCH /congresos/:id` con
  `correr_sesiones` y sus reglas. **Sin migraciones** en el 8.7.h.
- Mockups de las variantes A/B: artifact "Nexvio · Rediseño del panel"
  (claude.ai). La B ("Noche Nexvio") queda como idea para una landing.

**SIGUIENTE: 8.7.i — cierre del bloque 8.7:**
1. Pruebas e2e nuevas (desde `apps\backend`): reglas de editar congreso
   (fin ≥ inicio, correr la agenda, sesión fuera → 409, zona con sesiones →
   409), `GET /sesiones/:id` (staff sí / participante 403), preguntas con
   apellidos/foto solo para staff, `GET /congresos` con `_count`. Correr
   también las anteriores del 8.7 (a–g) para ver que nada se rompió.
2. GUIA_DEV **§ 27 (Bloque 8.7)**: qué se hizo a–h, comandos, y gotchas:
   verificar SIEMPRE las copias al PC (nunca editar y copiar en paralelo);
   transacciones a mano en pruebas con `{ maxWait: 15000, timeout: 20000 }`;
   Smart App Control de Windows bloquea `schema-engine` (desactivarlo);
   reiniciar el backend tras cambiar DTOs (`forbidNonWhitelisted`); caché
   vieja de Next → `rmdir /s /q .next`; en el panel no usar textos que
   dependan del tema en el HTML del servidor (error de hidratación del botón
   de tema); un `replace` de texto repetido puede caer en varios métodos
   (pasó en `preguntas.service`) → anclar al método.
3. Cerrar el 8.7 aquí (✅) y actualizar el encabezado de la GUIA.

**Después del 8.7:** reunión con el cliente (cambios que pida) · development
build con EAS + FCM + prueba de push real · Fase 9 · Fase 7.

**Método (no cambia):** paso a paso y explicado; Sebastián hace los commits;
cada bloque cierra con prueba; GUIA_DEV y HANDOFF se actualizan al cerrar y
las decisiones se anotan aquí al tomarlas. Credenciales nunca en el repo.

---

## (Histórico) PUNTO DE RETOMA (3-nov-2026, noche)


**Hecho y con commit:** 8.7.a, 8.7.b, 8.7.c (+ ajustes) y 8.7.d (+ ajustes:
perfil desde el chat, logo sin borde, contacto granular, política v4).
**Siguiente:** **8.7.e — Mi agenda** (marcar charlas favoritas + avisos solo a
quienes marcaron una charla). Luego 8.7.f (Patrocinado por), 8.7.g (tema y
apariencia de la app), 8.7.h (pulido visual del panel web) y 8.7.i (pruebas +
GUIA § 27 + cierre del bloque).
**Gotcha nuevo (anotar en GUIA § 27):** al copiar archivos al PC, verificar
SIEMPRE después de copiar (dos veces llegó una versión vieja); nunca editar y
copiar en paralelo. Y las transacciones a mano en pruebas llevan
`{ maxWait: 15000, timeout: 20000 }`.
