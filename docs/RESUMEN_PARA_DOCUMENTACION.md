# Nexvio — Resumen técnico para la documentación de la tesis

> **Para quién:** para María José (y cualquiera que escriba el documento final).
> **Qué es:** el mapa de todo lo que se construyó, **por qué** se hizo así y
> **dónde** está el detalle. No repite los documentos largos: los resume y
> dice en qué sección mirar.
> **Fecha de corte:** 7-nov-2026 (después de la reunión con el cliente).
>
> | Documento | Para qué sirve | Cómo leerlo |
> |---|---|---|
> | **Este resumen** | Visión completa y justificaciones | Primero |
> | `GUIA_DEV.md` ("GUIA § n") | Cómo funciona cada parte del código, con ejemplos | Por secciones, según el tema |
> | `HANDOFF.md` | Bitácora: decisiones con fecha, *gotchas*, pendientes | Buscar por fase o por número de decisión |
> | `PRUEBAS_NEXVIO.md` | **Todo sobre las pruebas**: estrategia, resultados, hallazgos, correcciones | Capítulo de pruebas y Anexo 5 |
> | `PLAN_DE_RUTA_NEXVIO.md` | El plan original (fases y decisiones previas al código) | Para comparar plan vs. resultado |
> | `NEXVIO_Vfinal.md` | La tesis aprobada | Lo que hay que actualizar |
> | `IDENTIDAD_VISUAL.md` | Marca: colores, tipografía, logo | Capítulo de diseño |
> | `diagramas.html` | C4, ERD y secuencia RLS | ⚠️ ERD y C4 desactualizados (ver § 10) |

---

## 1. Qué es Nexvio y qué hace hoy

Plataforma **SaaS multi-tenant** para gestionar congresos, para Grupo Studio
Sebia / AMCPER. Una sola instalación atiende a **muchas organizaciones**, cada
una con sus datos **aislados** de las demás. Tiene dos aplicaciones cliente y
un backend:

| Pieza | Usuarios | Qué permite |
|---|---|---|
| **Panel web** (Next.js) | Superadmin, organizadores, coordinadores | Crear organizaciones y congresos; importar asistentes desde Excel y entregar credenciales; agenda por día (charlas y breaks) con ponentes; patrocinadores por nivel; apariencia del congreso (logo, portada, colores, tema); notificaciones al momento o programadas; responder preguntas y abrir encuestas en vivo; atender solicitudes de datos (Ley 1581); Ayuda editable. |
| **App móvil** (Expo) | Asistentes | Entrar con usuario y contraseña temporal; aceptar la política de datos; ver **solo su congreso**; agenda y "Mi agenda" (⭐); preguntas privadas y encuestas en vivo; networking tipo Tinder con match y chat; notificaciones; perfil con foto; derechos de datos (consultar, revocar, pedir supresión); tema claro/oscuro; **español, inglés y portugués**. |
| **Backend** (NestJS) | — | API REST (104 rutas), tiempo real (Socket.io), autenticación, autorización y aislamiento por organización. |

**Estado:** Fases 0–6 y Fase 8 terminadas (incluida la app compilada con
notificaciones push reales). Pendiente: Fase 9 (carga, seguridad,
despliegue) y Fase 7 (WhatsApp + agente IA). La app se probó en Android.

---

## 2. Arquitectura

### 2.1. Vista general (lo que iría en el C4 de contenedores)

```
 Asistente ── App móvil (Expo) ──┐                      ┌── Supabase Auth (JWT)
                                 ├─ HTTPS + Socket.io ─▶ Backend NestJS ──┼── PostgreSQL + RLS
 Staff ────── Panel web (Next) ──┘                      ├── Supabase Storage (imágenes)
                                                        └── Expo Push (notificaciones)
```

- Las dos apps inician sesión **directamente con Supabase Auth** y reciben un
  **JWT** con *claims* propios: `rol` y `organizacion_id` (los pone un *hook*
  de la base). Con ese token llaman al backend (GUIA § 7).
- El backend **nunca** se conecta como `postgres` (que se salta el RLS), sino
  con el rol **`nexvio_app`**, sin privilegios de administrador (GUIA § 5.2).

### 2.2. Multi-tenancy con RLS (el núcleo de la tesis)

1. Toda tabla de negocio tiene `organizacion_id` (GUIA § 4).
2. Cada tabla tiene **políticas RLS**: solo se ven y escriben filas cuyo
   `organizacion_id` sea igual a `app.org_id` (GUIA § 5.1).
3. En cada petición, el backend saca la organización **del token firmado** y
   abre una transacción que fija `app.org_id` (`runInTenant`, GUIA § 6).
4. Resultado: **aunque el código olvide un `WHERE`, la base no devuelve datos
   de otro cliente** (*fail-closed*). Se probó con pruebas automatizadas de
   aislamiento con usuarios reales (GUIA § 9.5).

**Excepciones controladas:** 4 funciones `SECURITY DEFINER` ("ventanillas"),
cada una con `search_path` fijo, solo lectura y permisos revocados a `PUBLIC`:
panorama del superadmin (2), login por nombre de usuario (1) y búsqueda de
notificaciones programadas vencidas (1). GUIA § 21, § 22, § 26.

**Superadmin:** no tiene una política "ve todo" (eso apagaría el aislamiento).
**Suplanta** a una organización con la cabecera `X-Organizacion-Id`, que el
backend solo obedece si el token firmado dice `rol: admin`. Cada petición
sigue viviendo en **un solo tenant** (GUIA § 21).

### 2.3. Autorización por capas

| Capa | Qué controla | Ejemplo |
|---|---|---|
| `AuthGuard` | ¿Hay un token válido? → 401 | GUIA § 7.2 |
| `RolesGuard` + `@Roles()` | ¿El rol puede usar esta ruta? → 403 | Un asistente no puede marcar una pregunta como respondida |
| `AccesoCongresoGuard` + `@SoloInscritos()` | ¿El asistente está inscrito en ESE congreso? → **404** (no confirma que existe) | GUIA § 27.2 |
| RLS en la base | ¿La fila es de su organización? | Siempre, en todas las tablas |

### 2.4. Tiempo real: "avisar y refrescar"

Socket.io con **salas** por charla y por conexión de chat. Cuando algo cambia,
el servidor solo emite un **aviso** (`preguntas:cambio`, `encuestas:cambio`,
`mensajes:cambio`) y cada pantalla **vuelve a pedir** los datos por REST. Así
los datos siempre pasan por la autorización y el RLS normales, y el socket no
filtra información (GUIA § 17.3). Entrar a una sala aplica la misma regla de
"solo inscritos".

### 2.5. Otras piezas

- **Imágenes:** el backend sube a Supabase Storage y la base guarda la URL
  (GUIA § 24, § 25).
- **Notificaciones:** al momento o programadas; un programador del backend
  revisa cada minuto. Destinos: todo el congreso, una charla o "quienes la
  marcaron con ⭐" (GUIA § 26, § 27.5).
- **Idiomas:** la app manda la cabecera `X-Idioma`; un filtro global traduce
  los errores y la política de datos llega en el idioma pedido (GUIA § 28).
- **Zona horaria:** el panel muestra las horas del lugar del evento, la app
  las del teléfono, y la base guarda UTC (GUIA § 24).

---

## 3. Stack y justificación

Tabla completa con el porqué de cada pieza: **GUIA § 2**. Resumen:
TypeScript en todo · NestJS 11 · Prisma 7 · PostgreSQL/Auth/Storage en
Supabase · Socket.io 4 · Next.js 16 + Tailwind 4 · Expo SDK 54 + NativeWind 4
· Expo Push · exceljs · i18next · monorepo con pnpm.

---

## 4. Diferencias con el diseño de la tesis (para actualizar el documento)

| En la tesis (`NEXVIO_Vfinal.md`) | Lo construido | Por qué |
|---|---|---|
| AWS Cognito | **Supabase Auth** | Gratis, JWT con *claims* propios, integrado a la base; Cognito eran días de configuración sin valor para la tesis. |
| "Separación por esquemas" | **RLS con esquema compartido** | Aislamiento en el motor de la base con una sola estructura; mantener un esquema por cliente es inviable para 2 desarrolladores. |
| AWS S3 | **Supabase Storage** | Ya incluido en Supabase. |
| AWS EC2 / RDS / ElastiCache / CloudWatch | **Servicios gestionados** (Supabase; backend en Railway/Render al desplegar) | Menor costo y sin administrar servidores. Monitoreo: Fase 9. |
| Redis para sesiones y caché | **No se usó (todavía)** | Con una instancia del backend no hace falta; se necesitará al escalar (adaptador Redis de Socket.io). |
| Next.js 14 | **Next.js 16** | Versión vigente al iniciar el panel. |
| Bandeja omnicanal (WhatsApp, Instagram, Facebook) + IA | **Pendiente (Fase 7)**; el MVP solo con WhatsApp | Instagram y Facebook tienen aprobación lenta. |
| (No estaba) | **Registro por Excel de la organización** y login por **usuario** (p. ej. `JPGarcia`) | Pedido del cliente (reunión de sep-2026): Nexvio no cobra ni inscribe; la organización envía el Excel. |
| (No estaba) | **Cumplimiento de la Ley 1581** dentro del producto | Tratamiento de datos personales de asistentes (§ 6). |
| (No estaba) | **Tres idiomas** en la app | Congresos internacionales (decisión 35). |

Además, `PLAN_DE_RUTA_NEXVIO.md` § 1 ya pedía alinear el párrafo 4.2.1 y la
Tabla 8 de la tesis (Cognito → Supabase Auth, esquemas → RLS).

---

## 5. Lo construido, fase por fase

Fechas tomadas de los commits del repositorio.

| Fase / bloque | Fecha | Qué se construyó | GUIA | Prueba de cierre |
|---|---|---|---|---|
| 0 · Fundaciones | jul-2026 | Monorepo, backend, panel y app base | § 3 | — |
| 1 · Base de datos y RLS | 28–29 jul | Prisma 7, rol `nexvio_app`, políticas RLS, contexto de tenant | § 4–6 | `rls_isolation_test.sql`, `rls_via_app.js` |
| 2 · Autenticación | 30 jul | Supabase Auth, hook de *claims*, guards por rol | § 7 | `e2e_congresos.js` |
| Puente · Alta de organizaciones | 30 jul | Crear organización + primer organizador | § 9 | `e2e_onboarding_aislamiento.js` |
| 3 · Congresos | jul–sep | CRUD de congresos, sesiones y ponentes | § 8 | `e2e_fase3_crud.js` |
| 4 · Inscripciones y app base | 3 sep | Inscripciones, alta de asistentes, primera app móvil, primer panel | § 12, 14–16 | `e2e_fase4_inscripciones.js`, `e2e_gestion_usuarios.js` |
| 5 · Participación en vivo | 3 sep | Preguntas y encuestas con Socket.io | § 17 | `e2e_fase5_*.js` (3) |
| 6 · Networking | 3 sep | Interés, match, chat con límite | § 18 | `e2e_fase6_*.js` (2) |
| — Reunión con el cliente | 10 sep | Identidad visual, registro por Excel, roles, panel del admin → **nueva Fase 8** | HANDOFF | — |
| 8.0 · Identidad visual | 12 sep | Tokens de marca claro/oscuro, logo "red de nodos" | § 19 | — |
| 8.1 · Modelo de datos | 1 oct | 4 tablas y columnas nuevas, RLS | § 20 | `e2e_fase8_1_modelo.js` |
| 8.2 · Superadmin | 1 oct | Suplantación de tenant, panel con menú lateral | § 21 | `e2e_fase8_2_superadmin.js` |
| 8.3 · Asistentes | 23 oct | CRUD, importación de Excel en 2 pasos, login por usuario, credenciales en Excel | § 22 | `e2e_fase8_3_usuarios.js` |
| Feria | 24–26 oct | Preparación de la demostración en la feria | § 23 | — |
| 8.4 · Agenda y ponentes | 27 oct | Reglas de agenda, zona horaria, "correr la agenda", fotos (Storage) | § 24 | `e2e_fase8_4_agenda.js` |
| 8.5 · Patrocinadores y marca | 27–29 oct | Sponsors por nivel, personalización con aviso de contraste (WCAG) | § 25 | `e2e_fase8_5_*.js` (2) |
| 8.6 · Notificaciones y Ayuda | 29–30 oct | Avisos al momento y programados, bandeja en la app, Ayuda editable | § 26 | `e2e_fase8_6_*.js` (2) |
| 8.7 · App móvil completa | 3–6 nov | Entrada y Ley 1581, solo su congreso, perfil, networking tipo Tinder, Mi agenda, patrocinio por charla, tema, rediseño del panel y de la app | § 27 | `e2e_fase8_7*.js` (9) |
| 8.8 · Idiomas | 7 nov | es / en / pt-BR, errores y política traducidos | § 28 | `e2e_fase8_8_idiomas.js` |
| 8.10 · Ajustes del cliente | 7–12 nov | Preguntas privadas, nombres unificados, cambio de congreso desde el Perfil | § 29 | `e2e_fase8_10_preguntas.js` |
| 8.9 · Build y push real | 12 nov | App compilada con EAS + Firebase (FCM); notificación real en Android | § 30 | Prueba manual en teléfono ✅ |

---

## 6. Seguridad y protección de datos (Ley 1581 de 2012)

**Seguridad técnica**
- Aislamiento por organización en la base (RLS) y conexión sin privilegios.
- Autorización en el backend, no solo ocultando botones: un asistente que
  pide un congreso ajeno recibe 404 (decisión 7).
- Las contraseñas son un *hash* irreversible: **no se pueden consultar**. El
  cliente pidió "ver las credenciales" y se reemplazó por restablecer
  contraseña + descargar el listado de acceso (8.3).
- Contraseña temporal que se cambia obligatoriamente al primer ingreso.
- Secretos solo en `.env`, nunca en el repositorio.

**Ley 1581 dentro del producto (8.7.a y 8.7.c)**
- **Autorización** al primer ingreso, guardada con fecha y **versión** de la
  política. Si la política cambia de fondo, se sube la versión y la app pide
  aceptarla de nuevo (Decreto 1377, art. 13).
- Política con el contenido mínimo del art. 13, con los **datos legales de
  cada organización** (razón social, NIT, área que atiende).
- **Derechos desde la app:** consultar y actualizar sus datos, **revocar** la
  autorización (sale del networking y se cierra la sesión) y **pedir la
  supresión** (el organizador la atiende en el panel).
- **Minimización:** de la edad solo se guarda el año de nacimiento; los demás
  asistentes ven solo el nombre de pila de quien pregunta (y desde el 8.10
  ni siquiera ven las preguntas de otros).
- **Consentimiento granular** para compartir el contacto con las conexiones:
  apagado por defecto, con interruptor por dato (teléfono, correo, LinkedIn);
  un dato apagado no sale del servidor.
- Política en 3 idiomas; **el español es la versión vinculante** (decisión 36).

GUIA § 27.3 y § 28.5 · HANDOFF decisiones 1, 10–13, 15, 18 y 36.

---

## 7. Decisiones clave y su justificación

Selección de las más relevantes para el documento. Todas están en el HANDOFF
con su fecha (las del 8.7 en adelante, numeradas del 1 al 41).

| Decisión | Por qué | Dónde |
|---|---|---|
| RLS en vez de esquemas por cliente | Aislamiento en el motor; simple de mantener | HANDOFF "Decisiones de arquitectura" · GUIA § 5 |
| Rol `nexvio_app` sin privilegios | `postgres` se salta el RLS (hallazgo de la Fase 1) | HANDOFF Fase 1 · GUIA § 5.2 |
| Suplantación de tenant para el superadmin | Una política "ve todo" apagaría el aislamiento | HANDOFF 8.2 · GUIA § 21 |
| `String` en vez de `enum` para tipos y estados | Agregar un valor no exige migración | HANDOFF 8.1 |
| Imágenes como URL (Storage), no en la base | Base liviana; Storage está hecho para eso | HANDOFF 8.1 |
| Importación de Excel en dos pasos (previsualizar → confirmar) | Un error podría crear cientos de cuentas basura | HANDOFF 8.3 |
| Credenciales en un Excel descargable, no por correo | Nexvio no envía correos y el correo del asistente es opcional | HANDOFF 8.3 |
| Cruces de horario: se avisan, no se bloquean | Hay charlas en paralelo en salas distintas | HANDOFF 8.4 |
| Horas del lugar del evento en el panel, del teléfono en la app | Congresos presenciales y virtuales | HANDOFF 8.4 |
| Aviso de contraste (WCAG) al elegir colores, sin bloquear | Accesibilidad sin quitarle libertad al organizador | HANDOFF 8.5 |
| Construir notificaciones sin compilar (bandeja en la app) | Expo Go no recibe push remotas en Android | HANDOFF 8.6 |
| "Solo su congreso" se hace cumplir en el backend (404) | Seguridad real, no solo de interfaz | Decisión 7 |
| Pestañas abajo + Perfil como menú | Lo diario al alcance del pulgar | Decisión 8 |
| Networking tipo Tinder; el match desbloquea el chat | Visual y familiar; evita mensajes no deseados | Decisiones 16–18 |
| Mockup antes de construir pantallas | El cliente/equipo aprueba el diseño antes del código | Decisiones 22, 32 |
| Idioma: el del teléfono, cambiable; cabecera `X-Idioma` | Internacional sin afectar al panel (solo español) | Decisiones 35–36 |
| No subir la versión de la política al traducirla | Traducir no es un cambio sustancial | Decisión 36 |
| Reunión con el cliente antes del build | Compilar una sola vez con todo pulido | Decisión 37 |
| Preguntas privadas y sin aprobar | Pedido del cliente: privacidad y menos pasos para el staff | Decisión 39 |

---

## 8. Pruebas

**Estrategia:** cada bloque se cierra con una **prueba automatizada de
extremo a extremo** que llama al **backend real** con usuarios reales de
Supabase. Las pruebas crean sus propios datos (congresos, asistentes) y, salvo
alguna de las primeras, los borran al terminar. Es la condición 2 de la "Definición de Hecho".

- **29 pruebas e2e** (`apps/backend/prisma/tests/e2e_*.js`) más 2 pruebas de
  aislamiento RLS (una en SQL y otra a través del backend).
- Cubren: aislamiento entre organizaciones, permisos por rol, reglas de
  negocio (agenda, Excel, networking), Ley 1581, tiempo real e idiomas.
- Comandos y lista completa: GUIA § 11 · tabla de las del 8.7: GUIA § 27.10.
- Cada bloque se probó además **a mano** en el panel y en un Android real
  (Expo Go), y los errores encontrados se corrigieron dentro del bloque.

**Pruebas de carga (Fase 9, en curso — detalle en `PRUEBAS_NEXVIO.md`):**
meta de **900 asistentes simultáneos** (decisión 48) con k6 y tres escenarios
(llegada, charla estrella en vivo, pico por notificación); criterios p95 < 1 s
y < 1 % de errores. Resultados hasta ahora: **0 % de errores en todos los
ensayos**; tras desplegar el backend junto a la base, la navegación normal
pasa (p95 0,67 s, antes 3,1 s); el tiempo real y los picos aún no pasan y se
están optimizando. Hallazgos: importación de Excel lenta con volumen (~940 ms
por persona), límite de Supabase por IP (riesgo en el Wi-Fi del evento),
latencia por dos transacciones por petición y la "avalancha de refrescos" del
tiempo real.

**Pendiente (Fase 9):** optimizaciones y medición oficial de 900, revisión de
seguridad OWASP (p. ej. límite de intentos en el login por usuario).

---

## 9. Cómo se trabajó (metodología real)

Coincide con la sección de metodología ya redactada en el proyecto de Claude
(`metodologia-anexo-resultados.md` y `medicion-avance-nexvio.md`):

- Trabajo en **bloques pequeños** (8.0, 8.1, …, y sub-bloques 8.7.a…j), cada
  uno con su prueba de cierre y su commit.
- **Definición de Hecho:** código en la rama principal + prueba e2e en verde +
  documentado en la GUIA + demostrable en ejecución.
- **Documentación viva:** la GUIA se amplía al cerrar cada bloque y las
  decisiones se anotan en el HANDOFF en el momento en que se toman.
- **El cliente en el ciclo:** reunión de sep-2026 (redefinió la Fase 8),
  demostración en la feria (oct-2026) y reunión de nov-2026 (ajustes del 8.10).
- **Diseño primero:** para el panel (8.7.h) y la app (8.7.j) se hicieron
  mockups y se eligió una variante antes de programar.
- 47 commits con mensajes convencionales (`feat(8.7.d): …`, `docs: …`).

⚠️ **Para verificar al redactar:** la tesis menciona revisión cruzada en
GitHub y un tablero Kanban; conviene confirmar con Sebastián cómo se aplicaron
en la práctica antes de afirmarlo en el documento.

---

## 10. Pendientes y trabajo futuro

| Pendiente | Tipo |
|---|---|
| Fase 9 · Pruebas de carga, seguridad, despliegue y monitoreo | Desarrollo |
| Fase 7 · Bandeja de WhatsApp + agente IA (OpenAI + pgvector) | Desarrollo (próximo semestre) |
| Revisión del inglés y portugués por un hablante nativo | Calidad |
| Revisión legal de la política de datos por el asesor del cliente | Legal |
| Aceptación de la política para el staff en el panel | Legal |
| Socket.io no respeta la suplantación del superadmin | Técnico menor |
| Nombres de países en inglés/portugués | Técnico menor |
| **Actualizar ERD y C4** (`diagramas.html` y la tesis) con las 23 tablas, Storage y Expo Push | **Documentación** |
| **Landing page comercial** (próximo semestre): página pública para vender Nexvio, con sus características, animaciones e imágenes, y un botón "Ingresar al panel" que lleva al login del staff. Pedida por el cliente en la reunión de validación (7-nov-2026); decisión 47 del HANDOFF | Desarrollo (próximo semestre) |
| Producto a mercado: auto-registro con código de evento, Instagram/Facebook, panel en otros idiomas | Futuro |

---

## 11. Cifras del proyecto (7-nov-2026)

| Qué | Cuánto |
|---|---|
| Commits | 47 |
| Tablas en la base | 23, todas con RLS (21 llevan `organizacion_id`) |
| Migraciones / scripts de configuración | 29 / 28 |
| Rutas de la API | 104 |
| Pantallas del panel / de la app | 22 / 16 |
| Pruebas e2e | 29 (+2 de aislamiento RLS) |
| Textos de la app por idioma | ~360 (×3 idiomas) |
| Decisiones numeradas (desde el 8.7) | 41 |
