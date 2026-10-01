# Guía de desarrollo — Nexvio

> **Nota (sep-2026):** tras la reunión con el cliente, la siguiente fase es la
> **Fase 8** (identidad visual + panel del administrador + producto completo).
> Las decisiones y el nuevo plan están en `HANDOFF.md`. Esta guía documenta el
> **código ya construido**; se ampliará al cerrar cada bloque nuevo.

> Guía viva. Se amplía al cerrar cada bloque de desarrollo. Su objetivo es que
> cualquiera (en especial Sebastián) entienda **cómo funciona la aplicación y el
> código**, sin dar nada por supuesto. Escrita en lenguaje accesible.
>
> **Estado:** Fases 0–2 completas (base de datos + RLS + capa de datos +
> **autenticación con Supabase Auth y autorización por rol**), **Fase 3 — Módulo
> Congresos** completa (CRUD de congresos, agenda/sesiones y ponentes, con
> validación de entrada) y **Bloque Puente** completo (**alta de organizaciones +
> primer organizador**, con aislamiento entre tenants probado con usuarios reales).
> También está el **Módulo Inscripciones (Fase 4 — backend)**: el asistente se
> inscribe a un congreso, consulta sus inscripciones y las cancela; el staff ve la
> lista de inscritos. Y está lista una **rebanada vertical del panel web** (login + lista de
> congresos conectada a la API real). Los módulos restantes se documentarán aquí a
> medida que se construyan. La **app móvil del asistente (Fase 4)** ya está lista (login, lista de congresos, detalle con agenda e inscripción). Y está la **participación en vivo (Fase 5)**: networking (interés mutuo, match y **chat** con límite) — Fase 6 — y la participación en vivo (preguntas moderadas y encuestas en tiempo real con Socket.io), entre el móvil y el panel del coordinador.

---

## 1. Qué es Nexvio

Nexvio es una plataforma **SaaS multi-tenant** para gestionar congresos y eventos.
"Multi-tenant" significa que una sola aplicación sirve a **muchas organizaciones
clientes** a la vez (cada cliente es un *tenant*), y los datos de cada una deben
quedar **completamente aislados** de los demás. Ese aislamiento es el corazón
técnico del proyecto.

Se compone de tres piezas (aún en construcción):

- **App móvil** (Expo / React Native) — para los asistentes.
- **Panel web** (Next.js) — para el staff (admin, organizadores, coordinadores).
- **Backend / API** (NestJS) — la lógica de negocio y el guardián de los datos.

Esta guía se centra, por ahora, en el **backend y la base de datos**, que es lo
que hemos construido.

---

## 2. Stack tecnológico (y por qué)

| Pieza | Tecnología | Por qué |
|-------|-----------|---------|
| Lenguaje | **TypeScript** | Tipado seguro en todo el stack. |
| Backend | **NestJS** | Framework estructurado (módulos, controllers, services). |
| Base de datos | **PostgreSQL** (en Supabase) | Soporta Row Level Security, el mecanismo de aislamiento. |
| ORM | **Prisma 7** | Traductor entre el código y la base; maneja migraciones. |
| Cliente Postgres | **pg** + `@prisma/adapter-pg` | Prisma 7 requiere un "driver adapter" para conectarse. |
| Hosting BD/Auth | **Supabase** | PostgreSQL gestionado + autenticación (se usará en Fase 1b). |
| Monorepo | **pnpm workspaces** | App móvil, web y backend en un solo repositorio. |

---

## 3. Estructura del repositorio

```
Nexvio/
├── apps/
│   ├── backend/    ← la API (NestJS) — lo que estamos construyendo
│   ├── web/        ← panel web (Next.js)
│   └── mobile/     ← app móvil (Expo)
├── packages/       ← código compartido (aún vacío)
└── docs/           ← documentos de tesis, HANDOFF y esta guía
```

### Dentro de `apps/backend/`

```
apps/backend/
├── prisma/
│   ├── schema.prisma          ← el "plano" de la base de datos (los modelos)
│   ├── migrations/            ← historial de cambios a la BD (SQL versionado)
│   ├── setup/
│   │   ├── 01_app_role.sql        ← crea el rol de aplicación "nexvio_app"
│   │   └── 02_rls_ponentes.sql    ← RLS de ponente y sesion_ponente (Fase 3)
│   └── tests/
│       ├── rls_isolation_test.sql  ← prueba de aislamiento (SQL Editor)
│       ├── rls_via_app.js          ← prueba de aislamiento (backend real)
│       ├── e2e_congresos.js        ← e2e auth + aislamiento (Fase 2)
│       └── e2e_fase3_crud.js       ← e2e del CRUD del Módulo Congresos (Fase 3)
├── prisma.config.ts           ← config de Prisma 7 (conexión de migraciones)
├── .env                       ← credenciales (NO se sube a git)
└── src/
    ├── main.ts                ← arranque de la app + ValidationPipe global
    ├── app.module.ts          ← módulo raíz (conecta todo)
    ├── prisma/
    │   ├── prisma.service.ts  ← cliente de BD + inyección del tenant
    │   └── prisma.module.ts   ← hace PrismaService disponible globalmente
    ├── auth/
    │   ├── tenant-context.middleware.ts  ← valida el JWT y fija el tenant
    │   ├── auth.guard.ts                 ← exige autenticación (401)
    │   ├── roles.guard.ts + roles.decorator.ts  ← autoriza por rol (403)
    │   ├── org-id.decorator.ts           ← @OrgId(): saca el org del token (Fase 3)
    │   └── supabase-admin.service.ts     ← Admin API de Supabase (crear cuentas)
    ├── congresos/             ← Módulo Congresos (Fase 3)
    │   ├── congresos.controller.ts + congresos.service.ts
    │   ├── sesiones.controller.ts  + sesiones.service.ts
    │   ├── ponentes.controller.ts  + ponentes.service.ts
    │   └── dto/               ← "moldes" de datos con reglas de validación
    ├── onboarding/            ← Alta de organizaciones (bloque puente)
    │   ├── onboarding.controller.ts + onboarding.service.ts
    │   └── dto/crear-organizacion.dto.ts
    └── tenant/
        └── tenant-context.ts  ← "memoria" por petición del organizacion_id
```

---

## 4. La base de datos

### 4.1. Los modelos (`schema.prisma`)

El `schema.prisma` es la **única fuente de verdad** de la estructura de la BD.
Ahí describimos las tablas como *modelos*. Por ahora tenemos el **núcleo de 4**:

- `Organizacion` — la raíz del tenant. Cada fila es un cliente de Nexvio.
- `Usuario` — pertenece a una organización (salvo el admin global, que es NULL).
- `Congreso` — un evento de una organización.
- `Sesion` — una charla dentro de un congreso.

En la **Fase 3** se añadieron dos tablas más:

- `Ponente` — un expositor registrado en un congreso (`congreso_id`). Campos:
  `nombre`, `bio`, `foto_url` (según el ERD de la tesis).
- `SesionPonente` — tabla intermedia de la relación **muchos-a-muchos** entre
  sesiones y ponentes (un ponente puede exponer en varias sesiones y una sesión
  puede tener varios ponentes). Se hizo **explícita** (en vez de la M:N implícita
  de Prisma) por dos razones: (1) para darle su propia columna `organizacion_id` y
  poder aplicarle **RLS** como al resto; (2) para controlar el nombre de la tabla
  (`sesion_ponente`). La pareja `(sesion_id, ponente_id)` es única.

Regla de oro: **toda tabla de negocio tiene una columna `organizacion_id`**. Esa
columna es el "apellido" que dice a qué cliente pertenece cada fila, y es sobre la
que se construye el aislamiento.

Ejemplo (modelo `Congreso`):

```prisma
model Congreso {
  id              String   @id @default(uuid()) @db.Uuid
  organizacion_id String   @db.Uuid          // ← a qué organización pertenece
  nombre          String
  fecha_inicio    DateTime @db.Date
  fecha_fin       DateTime @db.Date
  estado          String   @default("borrador")

  organizacion Organizacion @relation(fields: [organizacion_id], references: [id])
  sesiones     Sesion[]

  @@index([organizacion_id])                 // índice: el RLS filtra por aquí
  @@map("congreso")                          // nombre real de la tabla en snake_case
}
```

Los nombres de columnas van en `snake_case` (`organizacion_id`, `creado_en`) a
propósito, para que coincidan **letra por letra** con el SQL de las políticas RLS.

### 4.2. Las migraciones

Una migración es un **cambio versionado** a la estructura de la BD, guardado como
un archivo `.sql`. Son el "control de versiones" de la base (el equivalente a los
commits de git, pero para tablas). Tenemos dos:

```
prisma/migrations/
├── 20260728225838_init_nucleo/     → creó las 4 tablas del núcleo
├── 20260728230346_rls_policies/    → activó RLS y creó las políticas del núcleo
├── 20260730203734_auth_token_hook/ → hook que inyecta org y rol en el JWT (Fase 2)
├── <ts>_fase3_ponentes/            → creó las tablas ponente y sesion_ponente
└── <ts>_rls_ponentes/              → RLS de esas dos tablas nuevas
```

Nota de flujo (Fase 3): las tablas las generó Prisma solo (`migrate dev`), pero el
RLS no vive en el `schema.prisma`, así que su migración se creó vacía
(`migrate dev --create-only`) y se le pegó a mano el SQL de
`prisma/setup/02_rls_ponentes.sql`. Es el mismo patrón de dos pasos que el núcleo.

Ciclo: se edita `schema.prisma` → se corre `prisma migrate` → Prisma compara y
genera el SQL → se aplica en Supabase. Nunca se edita una migración ya aplicada;
siempre se crea una nueva encima. Así cualquiera puede reconstruir la BD exacta.

---

## 5. El corazón: multi-tenancy con RLS

**RLS (Row Level Security)** es una regla que vive *dentro* de PostgreSQL y filtra
las filas automáticamente. Es como un portero en la puerta de cada tabla que, antes
de mostrarte una fila, pregunta: *"¿tu `organizacion_id` coincide con el de esta
petición?"*. Si no, la fila **no existe** para ti.

Lo potente: la seguridad NO depende de que el programador recuerde escribir
`WHERE organizacion_id = ...`. Aunque se le olvide, o haya un bug, la base **nunca**
deja escapar datos de otro tenant.

### 5.1. Las políticas (migración `rls_policies`)

Por cada tabla hacemos tres cosas (ejemplo con `congreso`):

```sql
ALTER TABLE "congreso" ENABLE ROW LEVEL SECURITY;   -- activa el filtrado
ALTER TABLE "congreso" FORCE  ROW LEVEL SECURITY;   -- aplica incluso al dueño

CREATE POLICY tenant_aislamiento ON "congreso"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
```

- `current_setting('app.org_id', true)` lee una variable que el backend fija en
  cada petición. El `, true` hace que, si nadie la fijó, devuelva NULL.
- `NULLIF(..., '')` trata el string vacío como NULL (evita un error de conversión).
- Resultado: **sin un tenant válido, no se ve ninguna fila** ("fail-closed",
  denegar por defecto — el estándar de seguridad más robusto).
- `USING` filtra lo que se puede LEER; `WITH CHECK` valida lo que se puede
  INSERTAR/ACTUALIZAR (no puedes crear datos de otra organización).

### 5.2. El detalle clave: los roles de PostgreSQL

Descubrimos algo importante: el rol `postgres` (el usuario "admin" por defecto)
**se salta el RLS**. Si la app se conectara como `postgres`, ¡el aislamiento no
serviría! Por eso creamos un rol dedicado, **`nexvio_app`** (ver
`prisma/setup/01_app_role.sql`), **sin privilegios de admin**. Sobre él, las
políticas RLS sí mandan.

La división queda así:

- **Migraciones** (crear/cambiar tablas) → se conectan como **`postgres`** (admin).
  Es el `DIRECT_URL` del `.env`.
- **La aplicación** (día a día) → se conecta como **`nexvio_app`** (esposado por
  el RLS). Es el `DATABASE_URL` del `.env`.

---

## 6. El código del backend

### 6.1. `tenant/tenant-context.ts` — la "memoria" por petición

Usa `AsyncLocalStorage` de Node, que da a **cada petición HTTP su propio espacio
de memoria aislado** (sin variables globales que se pisen entre usuarios). Ahí se
guarda el `organizacion_id` y el rol del usuario que hace la petición.

```ts
export const tenantStorage = new AsyncLocalStorage<TenantContext>();
```

Por ahora está listo para usarse; lo llenará el guard de autenticación en Fase 1b.

### 6.2. `prisma/prisma.service.ts` — el cliente de BD

Es el objeto que toda la app usa para hablar con la base. Dos responsabilidades:

1. **Conectarse** como `nexvio_app` usando el driver adapter de Prisma 7:

   ```ts
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   super({ adapter });
   ```

2. **Inyectar el tenant** en cada consulta, con el método `runInTenant`:

   ```ts
   async runInTenant(orgId, fn) {
     return this.$transaction(async (tx) => {
       // equivalente a SET LOCAL app.org_id, pero parametrizado (sin inyección SQL)
       await tx.$executeRaw`SELECT set_config('app.org_id', ${org}, true)`;
       return fn(tx);   // aquí van tus consultas, ya filtradas por el RLS
     });
   }
   ```

   Abre una transacción, fija `app.org_id` (que es lo que leen las políticas RLS),
   y corre tus consultas dentro. A partir de ese punto, la base filtra sola.

### 6.3. `prisma/prisma.module.ts` — disponibilidad global

Marca el `PrismaService` como `@Global`, para poder inyectarlo en cualquier módulo
del backend sin reimportarlo cada vez.

---

## 7. Autenticación y autorización (Fase 1b)

### 7.1. Cómo se unen Supabase Auth y nuestra tabla `usuario`

Supabase Auth maneja el login y emite un **JWT** (token firmado). Pero ese token,
por defecto, no conoce el `organizacion_id` ni el `rol` (viven en nuestra tabla
`usuario`). Los unimos así:

- Cada usuario de Auth se corresponde con una fila en `usuario` con el **mismo id**
  (el `sub` del token).
- Un **Custom Access Token Hook** (función Postgres `custom_access_token_hook`, en
  la migración `auth_token_hook`) se ejecuta al emitir cada token: lee el
  `organizacion_id` y el `rol` del usuario y los **inyecta como claims** en el JWT.
- Firma: el proyecto usa **ES256 (ECC, asimétrica)**. El backend verifica con la
  clave pública del endpoint **JWKS** de Supabase; no hay secreto compartido.

### 7.2. Las piezas del backend (`src/auth/`)

- **`tenant-context.middleware.ts`** — corre en CADA petición: si hay token,
  verifica su firma (con `jose` + JWKS), saca los claims, los pone en `req.user`
  y ejecuta el resto de la petición dentro del `AsyncLocalStorage` (contexto de
  tenant). Se registra globalmente en `main.ts`.
- **`auth.guard.ts`** (`AuthGuard`) — exige estar autenticado: si no hay
  `req.user`, corta con 401.
- **`roles.guard.ts` + `roles.decorator.ts`** — `@Roles('organizador', ...)` marca
  qué roles pueden usar un endpoint; el `RolesGuard` lo verifica (403 si no cumple).

### 7.3. Ejemplo real: el módulo `congresos`

`src/congresos/` es el primer módulo de negocio y sirve de plantilla para el resto:

```ts
@Controller('congresos')
@UseGuards(AuthGuard, RolesGuard)          // 1) autenticado  2) rol permitido
export class CongresosController {
  @Get()
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  findAll() { return this.congresos.findAll(); }
}

// En el service — fíjate que NO hay WHERE organizacion_id:
findAll() {
  return this.prisma.runInTenant(undefined, (tx) =>
    tx.congreso.findMany({ select: { id: true, nombre: true, organizacion_id: true } }),
  );
}
```

`runInTenant(undefined, ...)` toma el `organizacion_id` del contexto (que llenó el
middleware desde el token) y el RLS filtra solo.

## 8. El Módulo Congresos (Fase 3 — CRUD completo)

Es el primer módulo de negocio "de verdad". Cubre tres cosas del ERD: los
**congresos**, su **agenda** (sesiones) y sus **ponentes**. Se organiza en tres
pares controller/service dentro de `src/congresos/`, más una carpeta `dto/`.

### 8.1. Los endpoints (las rutas)

| Recurso | Rutas |
|---|---|
| Congresos | `POST /congresos` · `GET /congresos` · `GET /congresos/:id` (trae agenda y ponentes) · `PATCH /congresos/:id` · `DELETE /congresos/:id` |
| Sesiones | `POST`/`GET /congresos/:congresoId/sesiones` · `PATCH`/`DELETE /sesiones/:id` |
| Ponentes | `POST`/`GET /congresos/:congresoId/ponentes` · `PATCH`/`DELETE /ponentes/:id` |
| Ponente ↔ Sesión (M:N) | `POST`/`DELETE /sesiones/:sesionId/ponentes/:ponenteId` |

**Permisos:** *leer* lo pueden todos los roles del tenant; *escribir*
(crear/editar/borrar) solo `admin` y `organizador` (vía `@Roles(...)`).

### 8.2. `@OrgId()` — el decorador que estampa el tenant

`src/auth/org-id.decorator.ts` es un **decorador de parámetro**: extrae el
`organizacion_id` del usuario autenticado (que el middleware puso en `req.user`
desde el JWT) y lo entrega como argumento al método del controller.

```ts
@Post()
@Roles('admin', 'organizador')
crear(@OrgId() orgId: string, @Body() dto: CrearCongresoDto) {
  return this.congresos.crear(orgId, dto);
}
```

Sirve para dos cosas: (1) pasárselo a `runInTenant(orgId, ...)` para activar el
RLS, y (2) **estamparlo al CREAR filas**. Esto último es clave de seguridad: el
RLS (`WITH CHECK`) exige que toda fila nueva lleve el `organizacion_id` del tenant
activo. No se rellena solo: se lo ponemos con el valor del token, así es imposible
crear datos "a nombre" de otra organización.

### 8.3. Los DTOs y la validación (`ValidationPipe`)

Un **DTO** (*Data Transfer Object*) es el "molde" de los datos que entran por el
cuerpo de una petición. En `dto/` cada uno describe sus reglas con decoradores de
`class-validator`:

```ts
export class CrearCongresoDto {
  @IsString() @IsNotEmpty() nombre: string;
  @IsDateString() fecha_inicio: string;   // "2026-09-01"
  @IsDateString() fecha_fin: string;
  @IsOptional() @IsIn(['borrador','publicado','archivado']) estado?: string;
}
```

En `main.ts` se activó **una vez** un `ValidationPipe` global que valida cada
cuerpo contra su DTO antes de entrar al controller:

- `whitelist: true` → borra campos que el DTO no declara (limpia basura).
- `forbidNonWhitelisted: true` → si mandan un campo de más, responde **400**.
- `transform: true` → convierte el JSON en una instancia real del DTO.

Además, los `:id` de la URL se validan con `ParseUUIDPipe` (si no es un UUID,
responde 400 sin tocar la lógica).

### 8.4. Patrón de los services (aislamiento sin `WHERE`)

Todos los métodos corren dentro de `runInTenant(orgId, ...)`, así que el RLS
filtra solo. Dos detalles que se repiten:

- **Al crear una sesión o ponente** se verifica antes, con un `findFirst`, que el
  congreso padre exista *dentro del tenant*. Como el RLS oculta lo ajeno, si
  intentas colgar una sesión de un congreso de otra organización el `findFirst`
  devuelve `null` → **404**. Cero fuga entre tenants.
- **Al actualizar/borrar** se hace primero un `findFirst` por id (filtrado por
  RLS): si es de otro tenant, es invisible → **404**; si existe, se actualiza/borra.
- **Borrar un congreso** elimina en orden sus vínculos `sesion_ponente`, luego sus
  sesiones y ponentes, y por último el congreso (no hay `ON DELETE CASCADE`
  configurado, así que lo hacemos a mano dentro de la misma transacción).

### 8.5. Prueba de cierre

`prisma/tests/e2e_fase3_crud.js` recorre el flujo real de un organizador: crea un
congreso, le añade 2 sesiones y 1 ponente, asigna el ponente a una sesión, lee el
detalle (debe traer las 2 sesiones y el ponente), comprueba que un cuerpo inválido
da 400, y al final **borra** el congreso (queda re-ejecutable). Si se le pasan las
credenciales de un usuario de **otra** organización como 3.º y 4.º argumento,
verifica además el aislamiento (Org B recibe 404 al mirar el congreso de Org A).

---

## 9. Alta de organizaciones (bloque puente)

Hasta aquí, las organizaciones y usuarios se creaban a mano. Este bloque añade el
**alta de un tenant nuevo** (una organización + su primer organizador) para tener
usuarios reales de dos organizaciones distintas.

### 9.1. Quién puede crear organizaciones

Solo el **admin global** (super-admin de Grupo Studio Sebia), vía
`POST /organizaciones` protegido con `@Roles('admin')`. El admin no pertenece a
ninguna organización (`organizacion_id` NULL). El día que se quiera auto-registro,
basta con añadir OTRO endpoint público (sin guards) que llame al mismo service.

### 9.2. El truco para no chocar con el RLS

Crear una organización parece imposible bajo RLS (no hay tenant todavía y las
políticas exigen `id/organizacion_id = app.org_id`). Se resuelve sin abrir ningún
hueco: **generamos el UUID de la organización en código** y lo usamos como tenant
activo (`runInTenant(orgId, ...)`). Así el `INSERT` de la organización (`id =
app.org_id` ✓) y el del primer usuario (`organizacion_id = app.org_id` ✓) pasan el
`WITH CHECK`. Todo sigue bajo RLS; ninguna conexión privilegiada.

La única excepción es el **admin global**: su fila lleva `organizacion_id` NULL, que
el RLS no deja insertar (fail-closed). Por eso se siembra una vez con un script
aparte (`prisma/setup/03_seed_admin.js`) que inserta por conexión directa `postgres`
(que se salta el RLS). Es el único punto que usa el camino privilegiado.

### 9.3. La cuenta de login (Supabase Admin API)

`SupabaseAdminService` crea la cuenta en Supabase Auth con la Admin API y la clave
secreta `service_role` (`SUPABASE_SERVICE_ROLE_KEY`, solo backend). La crea ya
confirmada (`email_confirm: true`), lista para loguearse. El `id` que devuelve Auth
se usa como `usuario.id`, manteniendo la convención `usuario.id == sub` del JWT.

### 9.4. La red de seguridad (compensación)

El orden es: (1) crear la cuenta de Auth; (2) guardar organización + usuario en la
base. Como Auth es un sistema externo, no entra en la misma transacción de la BD.
Si el guardado falla **después** de crear la cuenta, el service **borra esa cuenta**
(`borrarUsuario`) para no dejar una cuenta huérfana sin su fila en `usuario`. Y si
el slug o el correo ya existían (violación de unicidad, `P2002`), responde 409.

### 9.5. Prueba de cierre

`prisma/tests/e2e_onboarding_aislamiento.js` (requiere el admin ya sembrado): el
admin crea 2 organizaciones; comprueba que un organizador **no** puede crear
organizaciones (403); el organizador de A crea un congreso; y el organizador de B
**no lo ve** (404 en detalle, ausente en su lista) mientras A sí — aislamiento real
entre tenants, ahora con usuarios de verdad y no con `SET ROLE` de SQL.

---

## 10. Flujo de una petición (cómo encaja todo — ¡ya funcionando!)

```
1. Usuario hace una acción (ej. "ver los congresos")
2. Llega al backend con su JWT en el header Authorization: Bearer <token>
3. TenantContextMiddleware → verifica la firma del token (JWKS) y saca los claims
4.                         → guarda { organizacion_id, rol } en el AsyncLocalStorage
5. AuthGuard               → exige que haya usuario autenticado (si no, 401)
6. RolesGuard              → verifica que el rol tenga permiso (si no, 403)
7. Service                 → la lógica de negocio pide datos
8. PrismaService.runInTenant → abre transacción y hace SET app.org_id = <del token>
9. PostgreSQL (RLS)        → filtra automáticamente: solo filas de esa organización
10. Respuesta              → el usuario ve SOLO sus datos
```

Todo el recorrido está probado de punta a punta con `prisma/tests/e2e_congresos.js`
(Fase 2) y `prisma/tests/e2e_fase3_crud.js` (Fase 3).

---

## 11. Cómo correr y probar

Desde `apps/backend/`:

```bash
# Generar el cliente de Prisma (tras cambiar el schema)
npx prisma generate

# Aplicar migraciones pendientes
npx prisma migrate dev

# Arrancar el backend en modo desarrollo
npm run start:dev

# --- Pruebas ---
# Aislamiento RLS por la capa de datos (rol nexvio_app)
node prisma/tests/rls_via_app.js

# Ver los claims de un JWT (verifica el hook)
node prisma/tests/get_token.js <email> <password>

# End-to-end: auth + aislamiento por el backend real (requiere start:dev corriendo)
node prisma/tests/e2e_congresos.js <email> <password>

# End-to-end CRUD del Módulo Congresos (Fase 3). El 3.º y 4.º arg (Org B) son
# opcionales: si se dan, prueba también el aislamiento entre organizaciones.
node prisma/tests/e2e_fase3_crud.js <emailA> <passA> [emailB] [passB]

# End-to-end del Módulo Inscripciones (Fase 4). Mismo patrón: Org B opcional.
node prisma/tests/e2e_fase4_inscripciones.js <emailA> <passA> [emailB] [passB]

# Gestión de usuarios (Fase 4): el staff da de alta un asistente y se valida
# que los permisos por rol se respeten. Deja creado test.asistente@nexvio.dev.
node prisma/tests/e2e_gestion_usuarios.js <emailOrganizador> <passOrganizador>

# (Opcional, demo) Cargar una agenda de ejemplo a un congreso para que se vea en
# el movil (2 sesiones + 1 ponente). Idempotente.
node prisma/setup/06_seed_agenda_demo.js <emailOrganizador> <passOrganizador> ["Nombre del congreso"]

# Fase 5 — participacion en vivo (requieren organizador Y asistente):
node prisma/tests/e2e_fase5_preguntas.js  <emailOrg> <passOrg> <emailAsis> <passAsis>
node prisma/tests/e2e_fase5_encuestas.js  <emailOrg> <passOrg> <emailAsis> <passAsis>
node prisma/tests/e2e_fase5_realtime.js   <emailOrg> <passOrg> <emailAsis> <passAsis>

# Fase 6 — networking y chat (organizador + asistente; crea el 2do asistente):
node prisma/tests/e2e_fase6_networking.js <emailOrg> <passOrg> <emailAsis1> <passAsis1>
node prisma/tests/e2e_fase6_chat.js       <emailOrg> <passOrg> <emailAsis1> <passAsis1>

# Fase 8 - Bloque 8.1: modelo de datos (no necesita el backend corriendo;
# habla con la BD directo como nexvio_app, igual que lo hara la app):
node prisma/tests/e2e_fase8_1_modelo.js

# Fase 8 - Bloque 8.2: superadmin (requiere el backend corriendo).
# Los 4 argumentos son: correo y clave del superadmin, y de un organizador.
node prisma/tests/e2e_fase8_2_superadmin.js <adminEmail> <adminPass> <orgEmail> <orgPass>

# Utilidad: cambiar la contrasena de cualquier cuenta de prueba de Supabase Auth
node prisma/setup/09_cambiar_password.js <email> <passwordNueva>

# --- Bloque puente: alta de organizaciones ---
# Sembrar el admin global (UNA vez). Requiere SUPABASE_SERVICE_ROLE_KEY en .env.
node prisma/setup/03_seed_admin.js <email> <password> "<nombre>"

# E2E: alta de 2 organizaciones + aislamiento REAL entre tenants (admin ya sembrado)
node prisma/tests/e2e_onboarding_aislamiento.js <adminEmail> <adminPass>
```

> **Recordatorio (bloque puente):** tras editar el `.env` (p. ej. al añadir
> `SUPABASE_SERVICE_ROLE_KEY`), **reinicia el backend** — un `start:dev` ya en marcha
> NO relee el `.env`, y verías un 500 *"Falta SUPABASE_SERVICE_ROLE_KEY"* aunque la
> clave esté en el archivo.

> **Gotcha de Windows (Fase 3):** tras cambiar el `schema.prisma`, si el
> `start:dev` está corriendo tiene bloqueados los archivos del cliente de Prisma y
> `migrate dev` **no logra regenerarlo** (se salta el paso en silencio). Síntoma:
> el backend no compila con errores tipo *"Property 'ponente' does not exist on
> type 'TransactionClient'"*. Solución: **detener** el `start:dev`, correr
> `npx prisma generate` y volver a arrancar.

---

## 12. El panel web (rebanada vertical)

Primer "cable" entre el frontend (Next.js) y el backend. Es pequeño a propósito:
su objetivo fue probar de punta a punta que el navegador puede autenticarse y
consumir la API protegida, y descubrir temprano los gotchas (CORS, token).

### 12.1. Estructura (`apps/web/src/`)

```
apps/web/
├── .env.local                 ← claves PÚBLICAS (NEXT_PUBLIC_*): URL Supabase, anon, API
└── src/
    ├── lib/supabase.ts        ← cliente de Supabase para el navegador + API_URL
    └── app/
        ├── page.tsx           ← raíz: redirige a /congresos
        ├── login/page.tsx     ← formulario de login (usa supabase-js)
        └── congresos/page.tsx ← lista los congresos llamando a la API con el token
```

### 12.2. El flujo del panel

1. El usuario entra a `/login` y mete correo/contraseña.
2. `supabase.auth.signInWithPassword` autentica y **guarda la sesión** en el
   navegador (localStorage). Redirige a `/congresos`.
3. `/congresos` pide el token de la sesión (`supabase.auth.getSession`) y llama a
   `GET {API_URL}/congresos` con la cabecera `Authorization: Bearer <token>`.
4. El backend verifica el token, fija el tenant y el **RLS filtra**: el navegador
   solo recibe (y pinta) los congresos de esa organización.

Es la misma cadena de seguridad de siempre, ahora disparada desde el navegador.

### 12.3. CORS (el gotcha esperado)

Por seguridad, el navegador no deja que una página en `localhost:3001` llame a
otra dirección (`localhost:3000`) salvo que el servidor lo autorice. Por eso en
`apps/backend/src/main.ts` se añadió `app.enableCors({ origin: 'http://localhost:3001' })`.
Sin esto, la petición a la API fallaría con un error de CORS en el navegador.

### 12.4. Decisión: sesión en el navegador (por ahora)

La sesión se maneja del lado del **navegador** (supabase-js + localStorage), que es
lo más simple para esta rebanada. Para producción se puede migrar a sesión por
**cookies del lado del servidor** (`@supabase/ssr`) sin tocar la API — solo cambia
cómo el frontend guarda y envía el token.

### 12.5. Cómo correr el panel

Necesitas **dos terminales**: una con el backend (`apps/backend` → `npm run start:dev`)
y otra con el web (`apps/web` → `npm run dev`, sirve en `localhost:3001`). Login de
prueba: `test.medicina@nexvio.dev`. Debe verse solo "Congreso de Medicina".

---

## 14. El Módulo Inscripciones (Fase 4 — backend)

Es el módulo que conecta a un **asistente** con un **congreso**. Es la base del
primer flujo desde el móvil: el asistente se loguea, ve la agenda y **se inscribe**.

### 14.1. La tabla `inscripcion`

Sigue la regla de oro (lleva `organizacion_id` para el RLS) y modela el ERD de la
tesis: enlaza un `usuario_id` con un `congreso_id`, más `estado` (`confirmada` |
`cancelada`) y `registrado_en`. La pareja `(congreso_id, usuario_id)` es **única**:
nadie se inscribe dos veces al mismo congreso (lo garantiza la BD, no el código).
Su RLS se aplicó con el mismo patrón de dos pasos (migración vacía + SQL a mano;
copia en `prisma/setup/04_rls_inscripcion.sql`).

### 14.2. Los endpoints

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /congresos/:congresoId/inscripciones` | cualquier rol del tenant | El usuario se inscribe **a sí mismo** |
| `GET /inscripciones/mias` | cualquier rol | Sus inscripciones **activas**, con el congreso |
| `DELETE /inscripciones/:id` | cualquier rol | Cancela **la propia** (soft: `cancelada`) |
| `GET /congresos/:congresoId/inscripciones` | staff (admin/organizador/coordinador) | Lista de **inscritos** de un congreso |

### 14.3. Decisiones clave

- **La identidad sale del token, no del cuerpo.** El decorador nuevo `@UserId()`
  (`src/auth/user-id.decorator.ts`) saca el id del usuario del claim `sub` del JWT.
  Así es imposible inscribir a otra persona mandando un `usuario_id` falso en el body.
- **Cancelación "soft".** Cancelar no borra la fila: la deja en `estado: 'cancelada'`.
  Conserva el historial y respeta la unicidad. Si el asistente se **reinscribe**, se
  **reactiva** esa misma fila (vuelve a `confirmada`) en vez de crear otra.
- **Solo la propia.** Al cancelar, si el id de la inscripción no es del usuario
  autenticado, se responde **404** (ni se confirma que existe). Sin fugas.
- **Borrado de congreso en cascada (manual).** Como no hay `ON DELETE CASCADE`, el
  `borrar` de congresos ahora también elimina las inscripciones del congreso, además
  de sesiones, ponentes y vínculos, todo en la misma transacción.

### 14.4. Prueba de cierre

`prisma/tests/e2e_fase4_inscripciones.js`: sin token → 401; crea un congreso; el
usuario se inscribe (201, `confirmada`); reinscribirse → 409; `mias` lo trae; el
staff ve 1 inscrito con su email; cancelar → `mias` ya no lo trae; reinscribirse
reactiva; y (opcional) Org B no puede inscribirse ni ver inscritos de Org A (404).
Limpia borrando el congreso. **Pasa (todo verde).**

> **Cómo consigue su cuenta el asistente (resuelto — Opción 1):** el staff da de
> alta a los asistentes con el endpoint `POST /usuarios` (ver sección 15). Así la
> app móvil solo necesita **login**, no registro.

## 15. Gestión de usuarios (alta de asistentes — Fase 4)

La app móvil es para asistentes (rol `participante`), pero hasta ahora solo existía
el organizador. Este bloque añade el **alta de usuarios** para que el staff cree las
cuentas de sus asistentes. Es el pendiente de "gestión de usuarios" del plan.

### 15.1. Los endpoints (`src/usuarios/`)

| Ruta | Rol | Qué hace |
|---|---|---|
| `POST /usuarios` | admin / organizador | Crea un **asistente** (o coordinador) en la organización del que pide |
| `GET /usuarios` | admin / organizador | Lista los usuarios de la organización |

### 15.2. Decisiones clave

- **Reutiliza el patrón del alta de organizaciones.** El `UsuariosService` usa el
  mismo `SupabaseAdminService`: (1) crea la cuenta de login en Supabase Auth, (2)
  guarda la fila `usuario` bajo RLS con el mismo id (== `sub` del JWT), y (3) si el
  guardado falla, **borra la cuenta** de Auth (compensación, sin huérfanos).
- **La organización sale del token** (`@OrgId()`), nunca del cuerpo: imposible crear
  usuarios en otra organización.
- **No se puede escalar privilegios.** El DTO solo acepta `rol` `participante` o
  `coordinador`. Un organizador no puede fabricar otro organizador ni un admin.
- **Sin cambio de BD.** La tabla `usuario` ya existía, así que este bloque no
  necesitó migración ni regenerar Prisma; solo reiniciar el backend.

### 15.3. Prueba de cierre

`prisma/tests/e2e_gestion_usuarios.js`: el organizador crea un asistente (201, o 409
si ya existía → test idempotente); el asistente puede loguearse y ver `/congresos`;
NO puede crear usuarios ni congresos (403 en ambos); y el organizador lo ve en
`GET /usuarios`. Deja creado un asistente fijo para el login del móvil:
**`test.asistente@nexvio.dev` / `asistente123`**. **Pasa (verde).**

## 16. La app móvil del asistente (Fase 4)

Primera pieza del asistente: una app **Expo (React Native)** donde inicia sesión, ve
los congresos de su organización, entra al detalle con la **agenda** y **se inscribe**.
Cierra el entregable de la Fase 4: el primer flujo completo desde el móvil.

### 16.1. Estructura (`apps/mobile/src/`)

```
src/
├── lib/
│   ├── config.ts       ← calcula la URL del backend (IP del PC, no localhost)
│   ├── supabase.ts     ← cliente de Supabase (sesión guardada en el teléfono)
│   ├── api.ts          ← fetch al backend con el token (Authorization: Bearer)
│   ├── formato.ts      ← formatea fechas y horas
│   └── tipos.ts        ← tipos TS de lo que devuelve la API
├── context/
│   └── AuthContext.tsx ← "memoria de sesión" compartida (useAuth)
├── navigation/
│   ├── RootNavigator.tsx ← decide Login vs App según haya sesión
│   ├── AppTabs.tsx       ← pestañas: Congresos / Mis congresos
│   └── CongresosStack.tsx← lista → detalle
├── screens/
│   ├── LoginScreen.tsx
│   ├── CongresosScreen.tsx
│   ├── CongresoDetalleScreen.tsx  ← agenda + botón Inscribirme/Cancelar
│   └── MisCongresosScreen.tsx
└── components/
    └── BotonSalir.tsx  ← cierra sesión desde la cabecera
```

### 16.2. Piezas clave

- **Navegación guiada por la sesión.** `RootNavigator` lee `useAuth()`: sin sesión
  muestra Login; con sesión, las pestañas. Al loguearse o salir, cambia **solo** —
  ninguna pantalla navega a mano. La sesión se guarda en `AsyncStorage`, así el
  usuario sigue logueado tras cerrar la app.
- **Misma cadena de seguridad que la web.** `api.ts` adjunta el token de Supabase;
  el backend verifica, fija el tenant y el **RLS filtra**. El asistente solo ve datos
  de su organización — ahora desde el móvil.
- **La identidad manda.** Al inscribirse, el `usuario_id` sale del token en el
  backend (`@UserId()`), no del móvil. La app solo dice "inscríbeme a este congreso".

### 16.3. Gotchas del móvil

- **`localhost` no sirve en el teléfono.** En Expo Go, `localhost` es el teléfono,
  no el PC. `config.ts` deriva la IP del PC desde `Constants.expoConfig.hostUri`
  (la misma que usa Metro) y le pone el puerto 3000. Requisito: teléfono y PC en el
  **mismo WiFi** y el backend corriendo.
- **Variables de entorno del móvil.** Expo solo expone al app las que empiezan por
  `EXPO_PUBLIC_`. Están en `apps/mobile/.env` (no va a git). Tras cambiarlas, reinicia
  Expo.
- **Zona horaria.** Las sesiones se guardan en UTC (`...Z`). La app las muestra en la
  hora local del teléfono, así que una sesión guardada a las 09:00 UTC se ve a las
  04:00 en Colombia (UTC-5). Es correcto; para la demo conviene guardar las horas ya
  pensadas en local (o formatear con una zona fija).

### 16.4. Cómo correrla

```bash
# 1) backend corriendo (apps/backend -> npm run start:dev)
# 2) desde apps/mobile:
npx expo start          # escanear el QR con Expo Go (mismo WiFi)
# Login de asistente de prueba: test.asistente@nexvio.dev / asistente123
```

## 17. Participación en vivo (Fase 5)

Preguntas moderadas y encuestas en tiempo real. Es la primera vez que el **móvil y
el panel se hablan en vivo**: lo que hace el asistente aparece al instante en el
panel del coordinador, y al revés.

### 17.1. El modelo (4 tablas nuevas)

`pregunta`, `encuesta`, `opcion_encuesta` y `respuesta_encuesta` — todas con
`organizacion_id` y RLS, como el resto. `respuesta_encuesta` lleva `encuesta_id` y
`@@unique(encuesta_id, usuario_id)`: **un voto por persona por encuesta**.

### 17.2. La API REST (`src/participacion/`)

| Recurso | Rutas | Quién |
|---|---|---|
| Preguntas | `POST/GET /sesiones/:id/preguntas`, `PATCH /preguntas/:id` | enviar: todos · moderar: staff |
| Encuestas | `POST/GET /sesiones/:id/encuestas`, `PATCH /encuestas/:id`, `POST /encuestas/:id/votar`, `GET /encuestas/:id/resultados` | crear/abrir: staff · votar: todos |

**Vista según rol** (decorador `@RolActual()`): el staff ve TODAS las preguntas
(para moderar) y todas las encuestas; el asistente ve solo las preguntas
**aprobadas/respondidas** y las encuestas **activas**. El REST es el que manda quién
ve qué, siempre.

### 17.3. El tiempo real (Socket.io) — patrón "avisar y refrescar"

El gateway (`realtime.gateway.ts`) es la capa nueva. Idea clave: por el socket NO
se mandan datos, solo **avisos**; al oír un aviso, cada cliente vuelve a pedir la
lista por REST (que ya filtra por rol y RLS). Así el tiempo real no puede filtrar
nada. Piezas:

- **Autenticación en un middleware** (`server.use`), que corre ANTES de dar por
  conectado al cliente: verifica el JWT (igual que en HTTP) y guarda la identidad en
  `socket.data`. Se hace aquí y no en `handleConnection` (asíncrono) para evitar una
  **condición de carrera**: si el cliente manda `join_sesion` antes de terminar la
  verificación, su identidad ya estaría lista de todos modos.
- **Salas por sesión.** Al unirse (`join_sesion`), se valida que la sesión sea del
  tenant (vía RLS) antes de meter al cliente a la sala `sesion:<id>`.
- **Los services avisan.** Tras crear/moderar una pregunta o crear/abrir/votar una
  encuesta, el service llama a `preguntasCambiaron` / `encuestasCambiaron`, que emiten
  `preguntas:cambio` / `encuestas:cambio` a la sala.

### 17.4. Gotcha resuelto: P2028 (transacciones bajo ráfagas)

En la demo, el socket dispara muchos refrescos a la vez (móvil + panel). Como cada
consulta corre en una transacción (para el RLS), por un instante se ocupaban todas
las conexiones y Prisma daba `P2028: Unable to start a transaction in the given time`
(esperaba solo 2s). Solución en `PrismaService`: `maxWait: 15000` y `timeout: 20000`
en `$transaction`, y `max: 15` en el pool del adapter.

### 17.5. El móvil (`SesionScreen`)

Las sesiones del congreso ahora son tocables y abren su pantalla: el asistente
**envía preguntas**, ve el **muro de aprobadas**, y **vota** la encuesta activa con
**resultados en barras**. Se une a la sala por socket (`lib/socket.ts`) y refresca al
oír los avisos; sale de la sala al abandonar la pantalla.

### 17.6. El panel del coordinador (`app/sesiones/[id]`)

Navegación Congresos → congreso → sesión. En la sesión, el staff **modera** las
preguntas (aprobar/rechazar/respondida) y **crea/abre/cierra encuestas** con
resultados en vivo. Mismo socket y patrón que el móvil. Los botones están blindados:
un fallo muestra un aviso **solo en desarrollo**, no rompe la pantalla.

### 17.7. Pruebas de cierre

`e2e_fase5_preguntas.js` (enviar, moderar, vistas por rol), `e2e_fase5_encuestas.js`
(crear, abrir, votar 1-vez, resultados) y `e2e_fase5_realtime.js` (el socket recibe
los avisos en vivo). **Las tres pasan.**

## 18. Networking (Fase 6)

Interés mutuo entre asistentes → **match** → **chat** con límite de mensajes.
Reaprovecha el Socket.io de la Fase 5 (por eso se sacó el gateway a un módulo
compartido, `src/realtime/`).

### 18.1. El modelo (3 tablas)

- `interes_networking` — interés **direccional** de A en B en un congreso (A→B es
  distinto de B→A). `estado`: `pendiente`/`correspondido`/`rechazado`. Único por
  dirección y congreso.
- `conexion` — nace con el match; apunta al interés que lo completó y lleva
  `limite_mensajes` (20 por defecto).
- `mensaje_chat` — cada mensaje del chat de una conexión.

### 18.2. La API REST (`src/networking/`)

| Ruta | Qué |
|---|---|
| `GET /congresos/:id/networking` | Directorio: otros inscritos + tu estado con cada uno (`ninguno`/`enviado`/`recibido`/`correspondido`) |
| `POST /congresos/:id/intereses` | Marcar interés; detecta match y crea la conexión |
| `GET /conexiones` | Tus matches |
| `GET/POST /conexiones/:id/mensajes` | Chat de una conexión (solo sus dos integrantes; respeta el límite) |

**El match:** cuando A marca interés en B y ya existía el de B en A, ambos pasan a
`correspondido` y se crea la conexión. **El chat es acotado:** al llegar a
`limite_mensajes`, enviar responde 400.

### 18.3. El tiempo real del chat

El gateway compartido añadió la sala `conexion:<id>` (solo los dos integrantes
pueden unirse, validado por RLS) y el aviso `mensajes:cambio`. Mismo patrón "avisar
y refrescar".

### 18.4. El móvil

Desde el detalle del congreso, botón **Networking** → directorio (Conectar /
Aceptar / Chatear) → **ChatScreen** (burbujas, contador de mensajes restantes, se
cierra al llegar al límite). Usa `useAuth()` para alinear tus mensajes a la derecha.

### 18.5. Pruebas de cierre

`e2e_fase6_networking.js` (interés → match → conexión, con directorio) y
`e2e_fase6_chat.js` (mensajes en vivo, aislamiento de terceros y el límite de 20).
**Las dos pasan.**

## 13. Glosario rápido

- **Tenant:** un cliente/organización. Nexvio es multi-tenant = sirve a varios.
- **RLS (Row Level Security):** filtrado de filas dentro de PostgreSQL.
- **`organizacion_id`:** columna que marca a qué tenant pertenece cada fila.
- **`app.org_id`:** variable de sesión que el backend fija por petición; el RLS
  la lee para saber qué tenant está activo.
- **Migración:** cambio versionado a la estructura de la BD (archivo SQL).
- **ORM (Prisma):** traductor entre el código TypeScript y la base de datos.
- **Driver adapter:** el conector que Prisma 7 usa para hablar con Postgres.
- **`nexvio_app`:** rol de BD de la aplicación, SIN privilegios de admin (el RLS
  sí lo controla). Distinto de `postgres` (admin, se salta el RLS).
- **fail-closed:** si falta el contexto de tenant, no se ve nada (denegar por defecto).
- **JWT (JSON Web Token):** un "carné digital" firmado que Supabase le da al usuario
  al iniciar sesión. Contiene datos (claims) como quién es (`sub`), su
  `organizacion_id` y su `rol`. Al estar firmado, el backend puede confiar en que
  nadie lo alteró (verifica la firma con la clave pública de Supabase). Viaja en
  cada petición en el header `Authorization: Bearer <token>`.
- **Claim:** cada dato guardado dentro del JWT (ej. `organizacion_id`, `rol`).
- **Middleware:** una función que se ejecuta ANTES de llegar al endpoint, en toda
  petición. Sirve para tareas transversales (aquí: validar el token y fijar el tenant).
- **`TenantContextMiddleware`:** nuestro middleware. En cada petición verifica la
  firma del JWT, extrae los claims y arranca el `AsyncLocalStorage` con el
  `organizacion_id` y el `rol`, para que el resto de la petición sepa qué tenant
  está activo. Vive en `src/auth/` y se registra global en `main.ts`.
- **`AsyncLocalStorage`:** herramienta de Node que da a CADA petición su propio
  "espacio de memoria" aislado, sin variables globales que se pisen entre usuarios.
  Ahí guardamos el `organizacion_id` del usuario para que el `PrismaService` lo lea
  sin tener que pasarlo a mano por cada función.
- **Guard:** un "portero" de NestJS que decide si una petición puede continuar hacia
  el endpoint o se rechaza.
- **`AuthGuard`:** el portero de **autenticación**. Deja pasar solo si el middleware
  ya validó un token (si no hay usuario, responde 401 = "no autenticado").
- **`RolesGuard` y `@Roles(...)`:** el portero de **autorización**. `@Roles('admin',
  'organizador')` marca qué roles pueden usar un endpoint, y el `RolesGuard` compara
  ese listado con el `rol` que trae el token (si no coincide, responde 403 =
  "prohibido"). Los roles del sistema son: `admin`, `organizador`, `coordinador`,
  `participante`.
- **Endpoint:** una "puerta" de la API: una URL + método HTTP (ej. `GET /congresos`)
  que el frontend llama para pedir o enviar datos. Vive en un *controller* de NestJS.
- **Controller / Service:** el *controller* define los endpoints (las rutas); el
  *service* contiene la lógica y habla con la base vía el `PrismaService`.
- **401 vs 403:** 401 = no estás autenticado (falta o falla el token); 403 = estás
  autenticado pero tu rol no tiene permiso.
- **DTO (Data Transfer Object):** el "molde" de los datos que entran por el cuerpo
  de una petición. Declara qué campos se aceptan y sus reglas (con decoradores de
  `class-validator`). Vive en `src/congresos/dto/`.
- **`ValidationPipe`:** el validador global (en `main.ts`) que revisa cada cuerpo
  contra su DTO antes de llegar al controller; rechaza con 400 lo mal formado,
  descarta campos no declarados y transforma el JSON en una instancia del DTO.
- **`@OrgId()`:** decorador de parámetro que saca el `organizacion_id` del usuario
  autenticado (del JWT). Se usa para activar el RLS y para estampar la organización
  al crear filas (el RLS `WITH CHECK` lo exige).
- **Tabla intermedia (M:N):** tabla puente para una relación muchos-a-muchos (aquí
  `sesion_ponente`, entre sesiones y ponentes). La hicimos explícita para darle
  `organizacion_id` y aplicarle RLS.
- **400 vs 404:** 400 = tu petición está mal formada (falla la validación); 404 =
  el recurso no existe *para ti* (no está, o es de otra organización y el RLS lo
  oculta).
- **`service_role` (clave):** la clave SECRETA de Supabase con privilegios totales
  (se salta el RLS y administra cuentas de Auth). Vive solo en el backend
  (`SUPABASE_SERVICE_ROLE_KEY`), nunca en el frontend ni en git. Distinta de la
  `anon`/`publishable`, que sí es pública.
- **Admin API (Supabase Auth):** las rutas `/auth/v1/admin/*` que permiten crear o
  borrar cuentas de login desde el backend (usando la clave `service_role`).
- **Onboarding / provisioning:** el alta de un tenant nuevo (organización + su
  primer usuario). En Nexvio lo hace el admin global vía `POST /organizaciones`.
- **Compensación:** deshacer un paso ya hecho cuando otro falla después, para no
  dejar datos a medias. Aquí: si el guardado en la BD falla tras crear la cuenta de
  Auth, se borra esa cuenta (no hay transacción que abarque un sistema externo).
- **Admin global:** el super-administrador de Grupo Studio Sebia. Rol `admin`,
  `organizacion_id` NULL (no pertenece a ningún tenant). Es el único que crea
  organizaciones. Se siembra una vez con `prisma/setup/03_seed_admin.js`.
```


---

## 19. Identidad visual (Bloque 8.0)

Primer bloque de la Fase 8. Monta la **identidad de marca** (Opción A: violeta
`#5A46F0` + coral `#FF7A59`, claro/oscuro), el **logo** (red de nodos) y las
**herramientas de UI** en las dos apps: shadcn en el web y NativeWind en el móvil.
No rediseña pantallas todavía (eso llega con el panel del admin y el rediseño del
móvil); deja el sistema listo para construir sobre él.

### 19.1. La fuente de verdad de la marca

`docs/IDENTIDAD_VISUAL.md` es el **único** sitio donde viven los colores, tipografías
y tokens. Si un valor cambia, se cambia ahí primero y luego se refleja en cada app.
Idea central: un **token de tema** es un *nombre con significado* (`primary`,
`coral`, `muted-foreground`) en vez de un color suelto. En claro y en oscuro el
**nombre no cambia, solo su valor** — por eso el modo oscuro funciona sin repintar
pantallas. Regla de oro: en una pantalla **nunca** un color a mano; siempre el token
(`bg-primary`, `bg-coral`, `text-muted-foreground`). El documento del **logo** con su
concepto y variantes está en `docs/logo-nexvio.html` (abrir en el navegador; sirve
para la sustentación).

### 19.2. Web — shadcn + tokens + tema claro/oscuro

- **shadcn** inicializado sobre **Next 16 + React 19 + Tailwind v4** (estilo
  `base-nova`, primitivos **Base UI**, íconos **Lucide**). En Tailwind v4 shadcn NO usa
  `tailwind.config.js`: la config vive en `components.json` y los tokens en
  `src/app/globals.css` (variables CSS bajo `:root` = claro y `.dark` = oscuro,
  expuestas a Tailwind con `@theme inline`). Ahí se añadió el token propio `--coral`.
- **Modo claro/oscuro** con `next-themes`: pone la clase `.dark` en `<html>`, recuerda
  la preferencia y respeta la del sistema. Piezas nuevas: `src/components/theme-provider.tsx`
  y `src/components/mode-toggle.tsx` (botón sol/luna, hoy flotante abajo-derecha; se
  moverá a la cabecera real del panel más adelante).
- **Tipografía**: cuerpo en Geist (ya existente); titulares/wordmark en **Space Grotesk**
  (`--font-heading`, cargada en `layout.tsx`).
- **Componentes base** traídos: `button`, `card`, `input`, `label` (en `src/components/ui/`).
- **Logo**: `src/components/logo.tsx` (`<Logo />` = símbolo + wordmark; `<NexvioMark />`
  = solo el símbolo, con `var(--primary)`/`var(--coral)`). Favicon en `src/app/icon.svg`
  (Next lo toma solo).
- **Pantallas convertidas a tokens** (de colores a mano → tokens/componentes): `login`,
  `congresos`, `congresos/[id]` y `sesiones/[id]` (moderación en vivo). Patrón de
  traducción: `bg-white`→`bg-card`, `text-zinc-900`→`text-foreground`,
  `text-zinc-500`→`text-muted-foreground`, `border-zinc-200`→`border-border`,
  `text-indigo-600`→`text-primary`, `bg-red-50/text-red-700`→`bg-destructive/10 text-destructive`.

Dependencias nuevas del web: `next-themes`, y las que trae shadcn (`class-variance-authority`,
`cn`, `tw-animate-css`, `lucide-react`, `@base-ui/react`).

### 19.3. Móvil — NativeWind + tokens

- **NativeWind v4** (`^4.2.6`) + **Tailwind 3.4.17** sobre Expo SDK 54. Archivos:
  `tailwind.config.js` (colores de marca por token, en canales RGB), `global.css` (los
  valores: `:root` claro + `@media (prefers-color-scheme: dark)` oscuro), `babel.config.js`
  (`jsxImportSource: nativewind` + preset `nativewind/babel`), `metro.config.js`
  (se **fusionó** `withNativeWind` con la config del monorepo pnpm), `nativewind-env.d.ts`,
  y `import './global.css'` en `App.tsx`.
- **Modo oscuro automático**: `darkMode: 'media'` + `"userInterfaceStyle": "automatic"`
  en `app.json` → sigue el tema del teléfono. (Un **toggle manual** en el móvil queda
  pendiente para el 8.7: implica pasar a `colorScheme`/`darkMode: 'class'`.)
- **Logo**: `src/components/Logo.tsx` con **react-native-svg** (símbolo + wordmark).
  **Íconos de la app** (`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`,
  `favicon.png`) generados desde el símbolo; fondo del ícono adaptativo (Android) en
  violeta. Nota: el ícono de la app solo se ve en una **build real**, no en Expo Go.
- **Login** convertido a `className` + tokens (antes usaba `StyleSheet` con colores a mano).

Dependencias nuevas del móvil: `nativewind`, `react-native-css-interop@0.2.6` (ver
gotcha en el HANDOFF), `react-native-svg`, y `tailwindcss@3.4.17` (dev).

### 19.4. Cómo pedir un color (regla práctica)

- Fondo de página: `bg-background` · texto principal: `text-foreground`.
- Tarjeta/panel: `bg-card` + `text-card-foreground` + `border-border`.
- Acción principal (violeta): `bg-primary text-primary-foreground`.
- CTA destacado (1 por pantalla): `bg-coral text-coral-foreground`.
- Texto tenue/ayudas: `text-muted-foreground`. Error/borrar: `*-destructive`.

Funciona igual en web y móvil porque los **nombres** de token son los mismos; solo
cambia dónde se definen (globals.css en web, tailwind.config + global.css en móvil).


---

## 20. El modelo de datos del panel del admin (Bloque 8.1)

Este bloque **no construye pantallas**: prepara la base de datos para todo lo que
pidió el cliente en la reunión (usuarios importados por Excel, agenda con breaks,
speakers con ficha, sponsors, personalización por congreso y notificaciones push).
Es el cimiento de los bloques 8.2–8.7.

La regla de oro sigue intacta: **toda tabla nueva lleva `organizacion_id`** y su
política RLS, así que el aislamiento entre clientes no depende de que el
programador se acuerde de filtrar.

### 20.1. Columnas nuevas en tablas que ya existían

| Tabla | Qué se agregó | Para qué |
|---|---|---|
| `usuario` | `username`, `apellidos`, `tipo_documento`, `numero_documento`, `telefono`, `cargo`, `empresa`, `pais`, `pais_codigo`, `foto_url`, `debe_cambiar_password`, `acepto_datos_en` | El **perfil del asistente** tal como llega en el Excel de la organización, el login por usuario tipo `JPGarcia` y la aceptación de la Ley 1581 |
| `congreso` | `descripcion`, `ciudad`, `lugar`, `zona_horaria` | Datos del evento y **en qué horario pintar la agenda** (las sesiones se siguen guardando en UTC) |
| `sesion` | `tipo`, `descripcion`, `orden` | Distinguir **charla vs. break** (café/almuerzo) y ordenar el día |
| `ponente` | `cargo`, `empresa`, `pais`, `pais_codigo`, `orden` | La **ficha del speaker** que pide el cliente (con bandera) |
| `inscripcion` | `tipo_suscripcion`, `origen` | El tipo de suscripción viene en el Excel y es **por congreso**; `origen` dice si la fila se creó a mano o importada |

Tres decisiones que vale la pena entender:

**a) ¿Por qué `tipo_suscripcion` vive en `inscripcion` y no en `usuario`?**
Porque es un dato de *la relación* persona↔congreso, no de la persona. La misma
doctora puede ser "Miembro" en el congreso de cardiología y "General" en el de
pediatría. Si lo pusiéramos en `usuario` tendríamos que elegir uno y perder el otro.
Regla práctica: *si un dato cambia según el congreso, va en la tabla que une a la
persona con el congreso.*

**b) ¿Por qué `tipo`, `estado`, `nivel`… son `String` y no `enum`?**
Un `enum` de Postgres da garantía a nivel de base, pero **agregar un valor nuevo
exige una migración**. Si mañana el cliente pide un tipo "panel" o "taller
simultáneo", con `String` solo tocamos la validación del DTO. Seguimos la
convención que ya traía el proyecto (`estado` en congreso, inscripción, pregunta…):
`String` + `@default(...)` + un comentario que lista los valores válidos, y la
validación de verdad la hace `class-validator` en el DTO. El único `enum` real
sigue siendo `Rol`, porque los roles sí son un conjunto cerrado y el `RolesGuard`
depende de ellos.

**c) `pais` y `pais_codigo` separados.**
`pais` es lo que se lee ("Colombia"); `pais_codigo` es el ISO-3166 de dos letras
("CO"). El front necesita el código para pintar la bandera, y no queremos que
dibujar una bandera dependa de cómo se escribió el nombre del país.

### 20.2. Las 4 tablas nuevas

```
sponsor                     → patrocinadores de un congreso (logo, nivel, orden)
personalizacion_congreso    → la marca del evento (logo, colores, portada, tema)
dispositivo_push            → a qué teléfonos entregar las push (token de Expo)
notificacion                → el historial de mensajes push que envió el admin
```

**`sponsor`** — `nombre`, `logo_url`, `sitio_web`, `nivel` (oro/plata/bronce/general)
y `orden`. El logo se sube a **Supabase Storage** (bloque 8.5) y aquí guardamos solo
la URL: la base de datos almacena *textos*, no imágenes. Es el mismo criterio que ya
usábamos en `ponente.foto_url`.

**`personalizacion_congreso`** — logo, imagen de portada, color primario/secundario y
tema por defecto. Es **1:1 con el congreso**, y lo que la convierte en 1:1 es una sola
palabra:

```prisma
congreso_id String @unique @db.Uuid
```

Sin `@unique` sería "un congreso tiene muchas personalizaciones"; con `@unique`,
Prisma la expone como `congreso.personalizacion` (un objeto, no una lista). Se hizo
tabla aparte en vez de 6 columnas dentro de `congreso` porque son datos de *imagen de
marca* que casi siempre se leen juntos y se editan en una sola pantalla del panel; así
la tabla `congreso` se mantiene liviana para las consultas del día a día.

**`dispositivo_push`** — Expo le da a **cada instalación de la app** un token
(`ExponentPushToken[...]`). Sin guardarlo no sabríamos a qué aparatos enviar, porque
una push no se manda "a un usuario", se manda a un dispositivo. Una persona puede
tener varios (teléfono + tablet), de ahí la relación uno-a-muchos con `usuario` y el
`@@unique([usuario_id, expo_push_token])` para no duplicar el mismo token.
El campo `activo` permite apagar un token que Expo reporte como inválido sin borrar el
historial.

> Se eligió `@@unique([usuario_id, expo_push_token])` en vez de hacer único el token
> solo. Motivo: con el RLS puesto, una fila de **otro tenant** que tuviera el mismo
> token sería invisible, y el INSERT fallaría con un error de duplicado imposible de
> explicar desde la app. Con la pareja, cada tenant gestiona sus propios tokens.

**`notificacion`** — `titulo`, `cuerpo`, `destino` (`todos` | `sesion`), `sesion_id`
opcional, `estado` (`borrador`|`enviada`|`fallida`), contadores `enviados`/`fallidos`,
`creado_por_id` y `enviado_en`. Guardar el historial sirve para dos cosas: que el admin
vea en el panel qué se mandó y cuándo, y poder **reintentar** un envío fallido sin
volver a escribirlo.

### 20.3. El RLS de las tablas nuevas

Mismo patrón de siempre, en `prisma/setup/07_rls_fase8.sql` y aplicado con la
migración `rls_fase8_modelo_datos`:

```sql
ALTER TABLE "sponsor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sponsor" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "sponsor"
  USING (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organizacion_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
```

Las 5 tablas que solo recibieron **columnas** no se tocan: su política ya protege la
fila completa, sin importar cuántas columnas tenga. *El RLS filtra filas, no columnas.*

Los `GRANT` tampoco hacen falta: `nexvio_app` los hereda de los *default privileges*
que dejó `01_app_role.sql` cuando se creó el rol.

### 20.4. Las dos restricciones que previenen errores humanos

```prisma
// en usuario
@@unique([organizacion_id, numero_documento])
```

Evita que, al importar el Excel dos veces (algo que *va* a pasar), la misma persona
quede duplicada. Detalle de Postgres que conviene saber: **los `NULL` no chocan entre
sí** en un índice único. Es decir, cientos de usuarios de staff sin documento conviven
sin problema; la regla solo muerde cuando hay un documento real repetido.

```prisma
// en personalizacion_congreso
congreso_id String @unique @db.Uuid
```

Evita dos personalizaciones para el mismo congreso (que dejaría a la app sin saber qué
colores usar).

### 20.5. Prueba de cierre

`prisma/tests/e2e_fase8_1_modelo.js` — no necesita el backend corriendo: se conecta a
la BD con el **mismo rol `nexvio_app` y el mismo mecanismo** que usa el backend
(`set_config('app.org_id', ...)` dentro de una transacción, que es literalmente lo que
hace `runInTenant`). Comprueba, en orden:

1. Las **columnas nuevas** se escriben y se leen (perfil completo, ficha de speaker,
   sesión de tipo `break`, valor por defecto `charla`, `zona_horaria`, suscripción).
2. Las **4 tablas nuevas** aceptan datos y aplican sus valores por defecto.
3. Las **restricciones**: segunda personalización → rechazada; documento repetido →
   rechazado (ambas con código `P2002`).
4. El **aislamiento**: sin tenant → 0 filas en las 4 tablas (*fail-closed*); la Org B
   no ve nada de la Org A; y la Org B **no puede crear** una fila estampada con el
   `organizacion_id` de la Org A (eso lo corta el `WITH CHECK`).
5. **Limpia** todo lo que creó, en orden inverso para no chocar con las claves
   foráneas, así que se puede correr tantas veces como se quiera.


---

## 21. El superadmin y la suplantación de tenant (Bloque 8.2)

Este bloque resuelve una pregunta incómoda: **¿cómo trabaja el superadmin si no
pertenece a ninguna organización?** Su `organizacion_id` es NULL, así que el RLS
—funcionando exactamente como debe— le devuelve cero filas.

Se barajaron tres caminos y conviene conocerlos, porque la decisión es defendible:

| | Qué hace | Por qué se descartó / eligió |
|---|---|---|
| A. Nada | El superadmin no entra a los datos | Inservible: el cliente pide que vea y gestione los congresos |
| B. Política "superadmin ve todo" | Una política extra por tabla, activada por una bandera | ❌ Es un interruptor que **apaga** el aislamiento. Un bug expone a todos los clientes a la vez |
| **C. Suplantación de tenant** | El superadmin **elige** una organización y trabaja dentro de ella | ✅ **La elegida.** El RLS queda intacto; solo cambia de casilla |

### 21.1. Cómo funciona la suplantación

El superadmin manda la cabecera `X-Organizacion-Id` y el middleware la convierte
en el tenant de esa petición:

```ts
// src/auth/tenant-context.middleware.ts
let orgId = orgDelToken;                       // lo normal: tu organización
if (rol === 'admin' && UUID_RE.test(orgPedida)) {
  orgId = orgPedida;                           // el superadmin elige dónde trabaja
  suplantando = true;
}
```

A partir de ahí, **para la base de datos el superadmin es un organizador más de
esa organización**. Lo importante es el efecto dominó: como `@OrgId()` lee ese
valor ya calculado, *todos* los controllers que ya existían (congresos,
sesiones, ponentes, inscripciones, participación, networking) funcionan para el
superadmin **sin cambiar una sola línea**.

Tres garantías, y son el argumento de seguridad del bloque:

1. **La cabecera solo se obedece si el TOKEN dice `rol: admin`.** Fíjate en que
   la condición mira el token —firmado por Supabase, imposible de falsificar—,
   no la cabecera. Nunca se decide un permiso con un dato que manda el cliente.
2. **Para cualquier otro rol la cabecera se ignora** (y se anota en el log). Un
   organizador que la mande sigue viendo solo lo suyo.
3. **Una petición vive en UN solo tenant.** Nunca se ven dos a la vez, así que
   un bug no podría *mezclar* datos de dos clientes en una misma respuesta. Esa
   es la diferencia de fondo con la opción B.

También se registra un rastro de auditoría: cada vez que el superadmin entra a
una organización, queda en el log a qué tenant entró y con qué petición.

### 21.2. Las dos ventanillas (`SECURITY DEFINER`)

Dos cosas cruzan tenants por naturaleza y no se pueden resolver con el RLS: la
**lista de organizaciones** (para poder elegir una) y el **panorama** de
congresos de todos los clientes que pidió el cliente.

Para eso, y solo para eso, hay dos funciones en
`prisma/setup/08_funciones_superadmin.sql`:

```sql
CREATE OR REPLACE FUNCTION public.nexvio_listar_organizaciones()
RETURNS TABLE (id uuid, nombre text, slug text, estado text,
               creado_en timestamptz, total_congresos int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ ... $$;

REVOKE ALL ON FUNCTION ... FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ... TO nexvio_app;
```

`SECURITY DEFINER` significa *"corre con los permisos de quien la creó"* —
postgres— y por eso ve por encima del RLS. Es el mismo mecanismo del
`custom_access_token_hook` de la Fase 2.

Los cuatro candados que la hacen segura:

| Candado | Qué impide |
|---|---|
| `STABLE` | Que pueda escribir. Solo lee |
| `SET search_path = public` | Que alguien la engañe apuntando a tablas falsas |
| `REVOKE ALL FROM PUBLIC` | Que cualquiera la ejecute |
| `GRANT EXECUTE TO nexvio_app` + `@Roles('admin')` | Que la use alguien que no sea el superadmin |

Y lo más importante: devuelven **columnas contadas**. Identificación y conteos.
Ni un dato de negocio. Si mañana hay que responder "¿qué puede ver el
superadmin por encima del aislamiento?", la respuesta cabe en un archivo.

La segunda, `nexvio_panorama_congresos()`, añade una columna calculada útil:
`en_curso` (`CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin`), que es lo que
permite poner arriba los congresos que están pasando ahora mismo.

### 21.3. `src/superadmin/` — las dos únicas rutas sin tenant

```
GET /superadmin/organizaciones   -> para el selector del panel
GET /superadmin/panorama         -> congresos de todos los clientes
```

Su service es el único de todo el backend que **no usa `runInTenant`**, y está
comentado ahí mismo para que no parezca un olvido. Todo lo demás que hace el
superadmin pasa por los endpoints normales con la cabecera puesta.

### 21.4. Quién puede crear organizadores

`POST /usuarios` ahora acepta `rol: 'organizador'`, pero el service compara
contra el rol de **quien pide**:

```ts
if (rolPedido === 'organizador' && rolDeQuienPide !== 'admin') {
  throw new ForbiddenException('Solo el superadmin puede crear organizadores');
}
```

Así el superadmin designa al "admin del congreso" de cada cliente, pero un
organizador **no puede clonarse**. Eso se llama prevenir una *escalada de
privilegios*, y es la razón por la que el rol viaja desde el controller
(`@RolActual()`) en vez de confiar en el cuerpo de la petición.

### 21.5. El panel web: layout con menú lateral

```
apps/web/src/
├── app/
│   ├── login/page.tsx            ← FUERA del panel (no lleva menú)
│   └── (panel)/                  ← route group: NO aparece en la URL
│       ├── layout.tsx            ← menú lateral + cabecera
│       ├── congresos/            ← /congresos  (se movió aquí)
│       ├── sesiones/             ← /sesiones/… (se movió aquí)
│       └── superadmin/           ← /superadmin  y  /superadmin/organizaciones
└── components/panel/
    ├── panel-contexto.tsx        ← quién eres + en qué organización estás
    ├── barra-lateral.tsx         ← el menú (con las entradas de 8.3–8.6 en "pronto")
    ├── cabecera.tsx              ← ModeToggle + cerrar sesión + selector
    └── selector-organizacion.tsx ← la cara visible de la suplantación
```

**Los paréntesis de `(panel)`** son un *route group* de Next: agrupan pantallas
para darles un layout común **sin que el nombre entre en la URL**. `/congresos`
sigue siendo `/congresos`. `/login` queda fuera a propósito, porque una pantalla
de login con menú lateral no tiene sentido.

**El `ModeToggle`** se movió del botón flotante provisional del Bloque 8.0 a la
cabecera real (pendiente arrastrado, ya resuelto).

**La cabecera viaja sola.** `apiFetch` lee la organización elegida de
`localStorage` y la adjunta en cada petición:

```ts
const org = leerOrgActual();
headers: { ...(org ? { 'X-Organizacion-Id': org.id } : {}) }
```

Por eso las pantallas **no saben nada** de la suplantación: `congresos/page.tsx`
pide "los congresos" y ya. Quien decide cuáles es el tenant activo.

**Al cambiar de organización se recarga la página entera** (no `router.push`).
Es deliberado: cambiar de tenant es un cambio de contexto grande y así no queda
ni un dato del cliente anterior flotando en pantalla.

**El rol se lee del JWT en el navegador** (`lib/sesion.ts`) sin verificar la
firma. Es seguro porque ahí solo se decide **qué pintar**. Regla que conviene
grabarse: *el frontend decide la experiencia, el backend decide los permisos.*
Si alguien manipulara su token para "verse" como admin, la API le respondería
403 igual.

### 21.6. Tres piezas reutilizables que nacieron aquí

Las tres salieron de ajustes pedidos tras la primera revisión visual, y las tres
se van a reusar en los bloques 8.3–8.6:

**`components/ui/selector-buscable.tsx`** — un *combobox*: se escribe para
filtrar, pero el valor solo queda fijado al **elegir** una opción. Es lo que
normaliza los datos: impide que "bogota", "Bogotá D.C." y "BOGOTA" acaben
siendo tres ciudades distintas en la misma columna. Busca ignorando tildes y
mayúsculas, se maneja con el teclado (flechas, Enter, Escape) y tiene un modo
`permitirLibre` que ofrece *Usar «lo que escribiste»* para los casos que el
catálogo no cubre — sigue siendo una elección explícita, no un descuido.

**`datos/paises.ts` y `datos/ciudades.ts`** — los catálogos. El país se guarda
en dos columnas: `pais` (lo que se lee) y `pais_codigo` (ISO-3166 alpha-2, para
la bandera), y así dibujar una bandera no depende de cómo se escribió el
nombre. Las ciudades dependen del país elegido: cambiar el país limpia la
ciudad, porque "Colombia + Madrid" no tendría sentido. Los mismos catálogos
alimentarán la ficha de speakers en el 8.4.

**`components/panel/dialogo-confirmar.tsx`** — confirmación propia en vez del
`window.confirm()` del navegador, que no respeta los colores de la marca ni el
modo oscuro. Tiene variante `peligroso` (botón rojo) para lo que viene: borrar
un usuario, borrar un speaker o mandar una push a todos los asistentes.

### 21.7. Limitación conocida

El **tiempo real (Socket.io)** todavía no entiende la suplantación: el gateway
valida la sala con el `organizacion_id` del token, no con la cabecera. En la
práctica significa que el superadmin puede gestionar un congreso ajeno, pero no
moderar sus preguntas en vivo. Se arregla pasando la organización en el
*handshake* del socket; queda anotado para el bloque donde haga falta.

### 21.8. Prueba de cierre

`prisma/tests/e2e_fase8_2_superadmin.js` (17 comprobaciones). Las tres que de
verdad importan:

- al cambiar de la Org A a la Org B **no se cuela ni un congreso** de la A;
- un **organizador que manda la cabecera** de otra organización sigue viendo
  solo la suya;
- un congreso creado por el superadmin en la Org B da **404** para la Org A,
  incluso para el propio superadmin cuando se cambia de casilla.
