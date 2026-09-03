# Guía de desarrollo — Nexvio

> Guía viva. Se amplía al cerrar cada bloque de desarrollo. Su objetivo es que
> cualquiera (en especial Sebastián) entienda **cómo funciona la aplicación y el
> código**, sin dar nada por supuesto. Escrita en lenguaje accesible.
>
> **Estado:** Fases 0–2 completas (base de datos + RLS + capa de datos +
> **autenticación con Supabase Auth y autorización por rol**), **Fase 3 — Módulo
> Congresos** completa (CRUD de congresos, agenda/sesiones y ponentes, con
> validación de entrada) y **Bloque Puente** completo (**alta de organizaciones +
> primer organizador**, con aislamiento entre tenants probado con usuarios reales).
> También está lista una **rebanada vertical del panel web** (login + lista de
> congresos conectada a la API real). Los módulos restantes se documentarán aquí a
> medida que se construyan.

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
