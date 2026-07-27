# Plan de Ruta — Desarrollo de Nexvio

> Documento de trabajo para construir Nexvio desde cero.
> Autores: Sebastián Durán Forero y María José Galindo Piñeros.
> Modo de trabajo: guía paso a paso — Claude indica cada paso, tú lo ejecutas.
> Objetivo: sistema **completo** (todos los módulos), aunque no desplegado, para la presentación; y base lista para llevar a mercado.

---

## 1. Decisiones cerradas antes de escribir código

Estas decisiones resuelven las contradicciones entre el documento de tesis y los diagramas. Las fijamos aquí para no dudar después.

| Tema | Decisión | Por qué |
|---|---|---|
| Autenticación | **Supabase Auth** (no AWS Cognito) | Gratis, emite JWT con claims, integrado con tu base de datos. Cognito son días de configuración sin valor para la tesis. |
| Multi-tenancy | **RLS con esquema compartido** (`organizacion_id`) | Es lo que ya dibujaste y es lo correcto para 2 devs. Nota: el texto de tesis cita "separación por esquemas"; hay que alinear esa redacción o saber defender RLS en la sustentación. |
| Base de datos | **PostgreSQL en Supabase** + extensión **pgvector** | pgvector te da el vector store para el RAG dentro de la misma base, sin agregar otra pieza. |
| Caché / realtime | **Redis en Upstash** | Gratis, para sesiones, rate limiting y pub/sub de Socket.io. |
| IA / RAG | **OpenAI API + pgvector** | Embeddings guardados en Postgres. Base de conocimiento = info del congreso (agenda, FAQs). |
| Mensajería (MVP) | **Solo WhatsApp** (Meta Cloud API) | Instagram y Facebook son más difíciles y de aprobación lenta. Se dejan para "producto a mercado". |
| Infraestructura | **Servicios gestionados** también en producción (Supabase de pago + Railway/Render) | Evita reescribir para AWS EC2/RDS/ElastiCache. Más barato y sin trabajo de DevOps que no aporta a la demo. |
| Estructura de código | **Monorepo** (backend, web, móvil en un solo repositorio) | Compartes tipos de TypeScript entre las tres partes; un solo Git. |

**Acción pendiente sobre la tesis:** revisar el párrafo 4.2.1 y la Tabla 8 para alinear "Cognito → Supabase Auth" y "esquemas → RLS". No es urgente para el código, pero sí para la coherencia del documento final.

---

## 2. Stack técnico definitivo

- **App móvil:** React Native con **Expo** (más simple que React Native puro para arrancar).
- **Panel web:** Next.js 14 + React + TailwindCSS.
- **Backend:** NestJS + TypeScript.
- **ORM:** Prisma.
- **Base de datos:** PostgreSQL (Supabase) + pgvector.
- **Caché / colas / pub-sub:** Redis (Upstash).
- **Realtime:** Socket.io.
- **Auth:** Supabase Auth (JWT).
- **IA:** OpenAI API + RAG sobre pgvector.
- **Mensajería:** Meta WhatsApp Cloud API.
- **Almacenamiento de archivos:** Supabase Storage (equivalente a S3, ya incluido) o AWS S3.
- **Control de versiones:** GitHub, con Conventional Commits y revisión cruzada.

---

## 3. Orden de construcción (por dependencias)

La regla de oro: **cada fase se apoya en la anterior**. No saltamos. Construimos el MVP de forma que el producto a mercado sea una extensión, no una reescritura.

### Fase 0 — Fundaciones y setup
Instalar herramientas, crear cuentas, montar el monorepo con los tres proyectos vacíos pero corriendo ("hola mundo" en cada uno). Cerrar las decisiones de la sección 1.
**Entregable:** los tres proyectos arrancan localmente.

### Fase 1 — Base de datos y multi-tenancy (RLS) 
El corazón de la tesis. Modelar el ERD en Prisma, migrar a Supabase, y escribir las políticas RLS. Probar con dos organizaciones que **una no puede ver los datos de la otra**.
**Entregable:** aislamiento demostrable entre tenants. Esto es lo que sustenta tu objetivo específico II.

### Fase 2 — Autenticación, roles y contexto de tenant
Supabase Auth + los guards de NestJS (AuthGuard, TenantContext con AsyncLocalStorage, RolesGuard) y el PrismaService que hace `SET LOCAL app.org_id`. Exactamente tu diagrama de secuencia.
**Entregable:** un usuario se loguea, su `org_id` viaja hasta la base y RLS lo filtra sin código manual.

### Fase 3 — Módulo Congresos (agenda, sesiones, ponentes)
CRUD completo en backend + vista del organizador en el panel web.
**Entregable:** el organizador crea un congreso y arma su agenda.

### Fase 4 — Inscripciones y app móvil base
Módulo de inscripciones + app Expo donde el asistente se loguea y ve la agenda.
**Entregable:** primer flujo completo desde el móvil.

### Fase 5 — Participación en vivo (Socket.io)
Preguntas en vivo (moderadas por el coordinador) y encuestas en tiempo real.
**Entregable:** demo en vivo entre móvil y panel. Muy vistoso para la sustentación.

### Fase 6 — Networking (intereses, match, chat limitado)
Interés mutuo → match → chat con límite de mensajes.
**Entregable:** dos asistentes se conectan y chatean en la app.

### Fase 7 — Bandeja omnicanal + agente IA (WhatsApp)
WhatsApp Cloud API + bandeja unificada + RAG que clasifica, responde FAQs y escala a humano.
**Entregable:** llega un WhatsApp, la IA lo responde o lo escala. Lo más impresionante y lo más riesgoso — por eso va tarde, cuando todo lo demás ya funciona.

### Fase 8 — Panel web completo (3 roles, métricas, personalización)
Las tres vistas por rol, métricas de participación, y personalización visual por congreso.
**Entregable:** panel administrativo completo.

### Fase 9 — Pruebas, seguridad y verificación final
Unitarias (70%), integración, e2e, carga (120+ usuarios) y seguridad (aislamiento, cifrado, Ley 1581).
**Entregable:** sistema completo verificado, listo para la demo.

---

## 4. MVP para la presentación vs. Producto a mercado

Ambos comparten la misma base. La diferencia es alcance y robustez.

| Componente | MVP (presentación) | Producto a mercado |
|---|---|---|
| Multi-tenant RLS | ✅ completo | ✅ + auditoría y pruebas de penetración |
| Auth y roles | ✅ | ✅ + recuperación de cuenta, MFA |
| Congresos y agenda | ✅ | ✅ + plantillas reutilizables |
| App móvil | ✅ Android | ✅ Android + iOS publicados en tiendas |
| Participación en vivo | ✅ | ✅ + escalado de carga real |
| Networking | ✅ | ✅ + moderación y reportes |
| Bandeja IA | ✅ solo WhatsApp | ✅ WhatsApp + Instagram + Facebook |
| Personalización | ✅ configurable | ✅ self-service para el cliente |
| Infraestructura | Local + Supabase gratis | Gestionada de pago + monitoreo + backups |
| Despliegue | No desplegado (corre local) | CI/CD, dominio, SSL, alta disponibilidad |

---

## 5. Cómo vamos a trabajar

1. **Una fase a la vez.** No abrimos la siguiente hasta cerrar la actual. Si algo se rompe, nos detenemos y lo resolvemos.
2. **Yo te doy el paso a paso, tú lo ejecutas.** Cada paso incluye: qué hacer, el código exacto, y una explicación corta de *por qué* — porque estás en nivel intermedio y esto tiene piezas nuevas (RLS, realtime, RAG).
3. **Cada fase cierra con una prueba.** No avanzamos sobre algo que no verificamos que funciona.
4. **Commits frecuentes** con Conventional Commits, para que tengas historial y puedas volver atrás.

---

## 6. Riesgos a vigilar (del análisis de la tesis)

- **Meta Business API:** la verificación de negocio puede tardar semanas. Empezar ese trámite temprano si quieres WhatsApp real; para la demo se puede usar el número de prueba de Meta.
- **RAG / agente IA:** la meta de 60% de resolución autónoma exige tuning. Empezar simple (FAQs fijas) y mejorar.
- **Alcance:** es un sistema grande para 2 personas. La disciplina de "una fase a la vez" es lo que evita que se desborde.

---

*Siguiente paso sugerido: arrancar la **Fase 0**. Cuando digas, te doy la lista exacta de instalaciones y cuentas, y montamos el monorepo juntos.*
