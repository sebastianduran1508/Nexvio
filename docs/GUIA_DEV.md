# Guía de desarrollo — Nexvio

> Guía viva. Se amplía al cerrar cada bloque de desarrollo. Su objetivo es que
> cualquiera (en especial Sebastián) entienda **cómo funciona la aplicación y el
> código**, sin dar nada por supuesto. Escrita en lenguaje accesible.
>
> **Estado:** Fase 1 completa (base de datos + multi-tenancy con RLS + capa de
> datos del backend). La Fase 1b de autenticación y los módulos de negocio se
> documentarán aquí a medida que se construyan.

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
│   │   └── 01_app_role.sql    ← crea el rol de aplicación "nexvio_app"
│   └── tests/
│       ├── rls_isolation_test.sql  ← prueba de aislamiento (SQL Editor)
│       └── rls_via_app.js          ← prueba de aislamiento (backend real)
├── prisma.config.ts           ← config de Prisma 7 (conexión de migraciones)
├── .env                       ← credenciales (NO se sube a git)
└── src/
    ├── main.ts                ← arranque de la app
    ├── app.module.ts          ← módulo raíz (conecta todo)
    ├── prisma/
    │   ├── prisma.service.ts  ← cliente de BD + inyección del tenant
    │   └── prisma.module.ts   ← hace PrismaService disponible globalmente
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
├── 20260728225838_init_nucleo/     → creó las 4 tablas
└── 20260728230346_rls_policies/    → activó RLS y creó las políticas
```

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

## 7. Flujo de una petición (cómo encaja todo)

Este es el recorrido que tendrá una petición cuando el backend esté completo (los
pasos con ⏳ son de Fase 1b, aún por construir):

```
1. Usuario hace una acción (ej. "ver la agenda del congreso")
2. Llega al backend con su JWT (token de sesión)
3. ⏳ AuthGuard     → valida el token
4. ⏳ TenantContext → saca el organizacion_id del token y lo guarda (AsyncLocalStorage)
5. ⏳ RolesGuard    → verifica que el rol tenga permiso
6. Service          → la lógica de negocio pide datos
7. PrismaService    → runInTenant abre transacción y hace SET app.org_id = <del token>
8. PostgreSQL (RLS) → filtra automáticamente: solo filas de esa organización
9. Respuesta        → el usuario ve SOLO sus datos
```

Lo que ya funciona hoy son los pasos **6, 7 y 8** (la capa de datos). Los pasos
3–5 (autenticación) son lo siguiente.

---

## 8. Cómo correr y probar

Desde `apps/backend/`:

```bash
# Generar el cliente de Prisma (tras cambiar el schema)
npx prisma generate

# Ver estado de las migraciones / conexión
npx prisma migrate status

# Aplicar migraciones pendientes
npx prisma migrate dev

# Prueba de aislamiento RLS por el backend real (rol nexvio_app)
node prisma/tests/rls_via_app.js
```

La prueba `rls_via_app.js` debe imprimir que Org A solo ve su congreso, Org B solo
el suyo, y sin tenant 0 filas → ✅ aislamiento correcto.

---

## 9. Glosario rápido

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
```
