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
- **8.1** Modelo de datos: perfil de asistente, sponsor, personalización, notificaciones, campos de speaker, tipo de sesión (break).
- **8.2** Superadmin: crear congresos (+ asignar admin).
- **8.3** Admin · Usuarios: CRUD + importar Excel (nuevo login por usuario + contraseña temporal).
- **8.4** Admin · Agenda + Speakers.
- **8.5** Admin · Sponsors + Personalización (reflejada en la app).
- **8.6** Admin · Notificaciones push (Expo) + Información/ayuda.
- **8.7** App móvil: diseño final + perfil + networking mejorado + ver SOLO su congreso + reflejar personalización/speakers/sponsors/notifs.

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

- **Un solo commit al final del Módulo 8** (decisión de Sebastián): TODO el Bloque 8.0
  está **sin commitear** aún. Lo pendiente por incluir: `docs/IDENTIDAD_VISUAL.md`,
  `docs/logo-nexvio.html`, la ampliación de `docs/GUIA_DEV.md` y este `HANDOFF.md`, y
  todo `apps/web` y `apps/mobile` (init shadcn, tokens, tema, logo, íconos, pantallas
  convertidas) + dependencias nuevas.
- Flujo actualizado: los archivos se **escriben directo en la carpeta** (no se pasan por
  el chat); Sebastián revisa y hará el commit.
