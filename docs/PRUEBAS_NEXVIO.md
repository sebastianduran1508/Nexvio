# Pruebas de Nexvio — qué se probó, qué se encontró y qué se corrigió

> **Para qué sirve este documento:** reúne en un solo lugar TODO lo relacionado
> con las pruebas del sistema: la estrategia, cada tipo de prueba, los
> resultados, los problemas encontrados, las correcciones y las decisiones
> tomadas. Es la fuente para el capítulo de pruebas y resultados de la tesis
> (sección 5.7, instrumentos, y sección 6, resultados) y para el Anexo 5.
>
> **Fecha de corte:** 13-nov-2026 (Fase 9 en curso). Se actualiza a medida
> que avanzan las pruebas.
>
> **Documentos relacionados:** `HANDOFF.md` (bitácora y decisiones con fecha;
> hallazgos 9.1-1 a 9.1-4), `GUIA_DEV.md` (§ 11 comandos, § 27.10 pruebas
> del 8.7, § 31 pruebas de carga), `RESUMEN_PARA_DOCUMENTACION.md` (§ 8).

---

## 1. Estrategia general

Nexvio se prueba en **cuatro niveles**, cada uno con un propósito distinto:

| Nivel | Qué responde | Herramienta | Variable de la tesis |
|---|---|---|---|
| **1. Pruebas de extremo a extremo (e2e)** | ¿Cada funcionalidad hace lo que debe, contra el sistema REAL? | Scripts de Node (`prisma/tests/e2e_*.js`) | Funcionalidad |
| **2. Pruebas de aislamiento** | ¿Una organización puede ver datos de otra? | SQL (`rls_isolation_test.sql`) y Node (`rls_via_app.js`) | Aislamiento de datos |
| **3. Pruebas manuales y de aceptación** | ¿Se ve y se usa bien en un teléfono real y en el navegador? ¿El cliente lo aprueba? | Android real (Expo Go / development build), navegador, reuniones con el cliente | Aceptación del cliente |
| **4. Pruebas de carga** | ¿Aguanta un congreso grande (700–900 personas a la vez)? | **k6** (`prisma/carga/`) | Rendimiento |
| *(pendiente)* **5. Revisión de seguridad** | ¿Tiene las vulnerabilidades web más comunes? | Lista **OWASP Top 10** | Seguridad |

**Principio que guió todo:** las pruebas se hacen contra el **sistema real**
(backend NestJS corriendo, base de datos PostgreSQL de Supabase, usuarios
reales de Supabase Auth), no contra simulaciones. Así un resultado verde
significa que **de verdad** funciona.

### 1.1. La "Definición de Hecho"

Ningún bloque de desarrollo se dio por terminado sin cumplir las cuatro
condiciones (ver `metodologia-anexo-resultados.md`):

1. Código en la rama principal del repositorio.
2. **Prueba automatizada de extremo a extremo del flujo completo, en verde.**
3. Procedimiento documentado en la guía de desarrollo.
4. Funcionalidad demostrable en ejecución (director o cliente).

Por eso hay **una prueba e2e por bloque**: cada fase y cada sub-bloque de la
Fase 8 cerró con la suya.

### 1.2. Datos de prueba y consideraciones éticas

- Todas las pruebas automatizadas **crean sus propios datos ficticios**
  (congresos, asistentes "Ana", "Beto", "Caro", "Asistente 001"…) y, salvo
  alguna de las primeras fases, **los borran al terminar**. Ningún dato
  personal real se usa ni se expone.
- Las cuentas y tokens de las pruebas de carga se guardan en
  `prisma/carga/datos/`, que **git ignora** (nunca se suben al repositorio).
- Las capturas para el documento usan datos de demostración.

---

## 2. Pruebas de extremo a extremo (e2e)

**Qué son:** scripts que hacen, paso a paso, lo mismo que haría una persona
(crear un congreso, importar un Excel, votar…), llamando a la API REAL, y
verifican cada respuesta. Cada verificación imprime `ok` o `FALLA`.

**Cómo se corren** (desde `apps/backend`, con el backend encendido):
```
node prisma/tests/<prueba>.js <correoOrganizador> <claveOrganizador>
```
(La lista completa de comandos está en la GUIA § 11.)

### 2.1. Catálogo: 29 pruebas e2e

| # | Prueba | Bloque | Qué verifica |
|---|---|---|---|
| 1 | `e2e_congresos.js` | Fase 2 | Sin token → 401; con token de la Org A solo se ven congresos de la Org A. |
| 2 | `e2e_onboarding_aislamiento.js` | Puente | Alta de 2 organizaciones con su organizador; el de la Org B **no ve** el congreso de la Org A (aislamiento con usuarios reales). |
| 3 | `e2e_fase3_crud.js` | Fase 3 | CRUD de congresos, sesiones y ponentes; relación ponente↔sesión; congreso invisible para otra organización (404). |
| 4 | `e2e_fase4_inscripciones.js` | Fase 4 | Inscribirse, no duplicar (409), listar, cancelar. |
| 5 | `e2e_gestion_usuarios.js` | Fase 4 | El staff da de alta asistentes; el asistente no puede gestionar usuarios ni crear congresos (403). |
| 6 | `e2e_fase5_preguntas.js` | Fase 5 / 8.10 | Preguntas en vivo: privadas, sin "aprobar" (400), marcar respondida, deshacer; el asistente no modera (403). |
| 7 | `e2e_fase5_encuestas.js` | Fase 5 | Encuesta cerrada invisible; abrirla; votar una sola vez (409 al repetir); resultados; el asistente no crea encuestas (403). |
| 8 | `e2e_fase5_realtime.js` | Fase 5 | Socket.io: unirse a la sala y recibir el aviso cuando alguien escribe (patrón "avisar y refrescar"). |
| 9 | `e2e_fase6_networking.js` | Fase 6 | Interés → match → conexión, estados del directorio. |
| 10 | `e2e_fase6_chat.js` | Fase 6 | Chat en vivo; un tercero no lo ve (404); límite de 20 mensajes (el 21 → 400). |
| 11 | `e2e_fase8_1_modelo.js` | 8.1 | Columnas y tablas nuevas, restricciones (1:1, no importar dos veces), RLS de las tablas nuevas. |
| 12 | `e2e_fase8_2_superadmin.js` | 8.2 | Panorama del superadmin; **suplantación** de organización; la cabecera se ignora para quien no es admin. |
| 13 | `e2e_fase8_3_usuarios.js` | 8.3 | Excel: previsualizar sin escribir nada, confirmar, credenciales, reimportar sin duplicar. |
| 14 | `e2e_fase8_4_agenda.js` | 8.4 | Zona horaria del evento, reglas de la agenda, "correr la agenda" (todo o nada), breaks. |
| 15 | `e2e_fase8_5_sponsors.js` | 8.5 | Patrocinadores por nivel, orden, reordenar, logos en Storage. |
| 16 | `e2e_fase8_5_personalizacion.js` | 8.5 | Colores, logo y portada; borrar el congreso borra sus imágenes. |
| 17 | `e2e_fase8_6_notificaciones.js` | 8.6 | Dispositivos, envío inmediato y programado, validaciones, bandeja de avisos. |
| 18 | `e2e_fase8_6_ayuda.js` | 8.6 | Ayuda editable solo por el superadmin, con un **segundo cerrojo** en la base (RLS por rol). |
| 19 | `e2e_fase8_7a_entrada.js` | 8.7.a | Primer ingreso: login por usuario, aceptar la política (Ley 1581) con versión, cambiar la clave. |
| 20 | `e2e_fase8_7b_acceso.js` | 8.7.b | "Solo su congreso": todo lo de otro congreso → 404, también la sala en vivo; sin auto-inscripción. |
| 21 | `e2e_fase8_7c_perfil_legal.js` | 8.7.c | Perfil, foto, datos legales de la organización, revocar, pedir y ejecutar la supresión (anonimizar). |
| 22 | `e2e_fase8_7d_networking.js` | 8.7.d | Tarjetas (edad, nunca el año ni datos privados), "Ahora no", visibilidad, ponentes vinculados. |
| 23 | `e2e_fase8_7e_agenda.js` | 8.7.e | Mi agenda (⭐), conteo sin revelar quiénes, aviso solo a quienes marcaron. |
| 24 | `e2e_fase8_7f_patrocinio.js` | 8.7.f | "Patrocinada por…", varios patrocinadores, solo los del mismo congreso. |
| 25 | `e2e_fase8_7g_tema.js` | 8.7.g | Tema por defecto del congreso (claro/oscuro/sistema). |
| 26 | `e2e_fase8_7h_panel.js` | 8.7.h-i | **33 verificaciones**: editar congreso (incluido el horario de verano), moderación, conteos, privacidad de quien pregunta. |
| 27 | `e2e_fase8_7j_conexion.js` | 8.7.j | **15 verificaciones**: eliminar una conexión borra chat e intereses y permite un match nuevo. |
| 28 | `e2e_fase8_8_idiomas.js` | 8.8 | **16 verificaciones**: errores y política de datos en es/en/pt; el panel sigue en español. |
| 29 | `e2e_fase8_10_preguntas.js` | 8.10 | **19 verificaciones**: preguntas privadas (el caso que vio el cliente en la reunión). |

**Resultado:** todas en verde al cerrar su bloque. Las del 8.7 se corrieron
juntas al cierre (5-nov-2026); la 8.8 dio 16/16 (7-nov); la 8.10 y las dos que
se actualizaron por ella (5 y 26) dieron verde el 12-nov-2026.

### 2.2. Pruebas que se actualizaron por cambios del cliente

Cuando el cliente cambió una regla, las pruebas viejas que daban por hecha la
regla anterior **se actualizaron** (no se borraron):

| Cambio (decisión) | Pruebas actualizadas |
|---|---|
| Preguntas privadas y sin "aprobar" (39) | `e2e_fase5_preguntas.js` (ahora verifica que el autor ve la suya y que "aprobar" da 400) y `e2e_fase8_7h_panel.js` (otro asistente ya NO recibe la pregunta) |

---

## 3. Pruebas de aislamiento entre organizaciones

El corazón de la tesis: **una organización nunca debe ver los datos de otra**.
Se prueba en dos capas.

### 3.1. En la base de datos (`prisma/tests/rls_isolation_test.sql`)

Se corre por pasos en el SQL Editor de Supabase, con el rol de la aplicación
(`SET ROLE nexvio_app`, que **no** se salta el RLS):

| Paso | Qué hace | Resultado esperado |
|---|---|---|
| 1 | Siembra dos organizaciones (A: Medicina, B: Derecho), cada una con un congreso | — |
| 2 | Consulta como la Org A | Solo "Congreso de Medicina" |
| 3 | Consulta como la Org B | Solo "Congreso de Derecho" |
| 4 | Consulta **sin organización** | **0 filas** (*fail-closed*: sin contexto no se ve nada) |

### 3.2. A través del backend (`prisma/tests/rls_via_app.js`)

Hace lo mismo pero con el **mismo adaptador y el mismo rol que usa la
aplicación**, para probar la capa de datos real.

**Hallazgo y corrección (12-nov-2026):** al correrla para tomar la evidencia,
salió "FALLO" aunque el aislamiento funcionaba: la Org A solo veía congresos de
Medicina y la Org B solo de Derecho. La causa era **la verificación de la
prueba**, escrita en la Fase 1, cuando cada organización tenía exactamente 1
congreso; con el tiempo otras pruebas crearon más. **Se corrigió la prueba**
para verificar lo que de verdad importa:

- ✅ Todo lo que ve la Org A es de la Org A.
- ✅ Todo lo que ve la Org B es de la Org B.
- ✅ Ninguna fila aparece en las dos.
- ✅ Cada una ve su congreso de siembra.
- ✅ Sin organización, 0 filas.

**Lección:** una prueba debe verificar la **propiedad** (aislamiento), no un
**dato puntual** que cambia con el tiempo (cuántos congresos hay).

### 3.3. El aislamiento también se prueba en las e2e

Varias pruebas e2e verifican el aislamiento con usuarios reales: la 2
(organizaciones), la 3 (404 entre organizaciones), la 11 (RLS de tablas
nuevas), la 12 (suplantación) y la 20 (el asistente solo ve SU congreso,
dentro de la misma organización).

---

## 4. Pruebas manuales y de aceptación

Además de las automáticas, cada bloque se probó **a mano** en un Android real y
en el navegador. Muchos errores de interfaz solo se ven así (una prueba
automática no ve que un texto quedó cortado o un color se ve mal).

### 4.1. Errores encontrados probando a mano (y corregidos)

| Bloque | Qué se vio | Corrección |
|---|---|---|
| 8.7.j | Las pestañas de la app aparecían amontonadas a la izquierda | `Pressable` con estilo como función pierde los estilos con NativeWind → `TouchableOpacity` |
| 8.7.j | El brillo de la cabecera se veía verde barroso | El brillo usaba el color secundario; ahora una variante clara del principal |
| 8.7.j | Las tarjetas de charlas pasadas se veían ilegibles | `opacity` apagaba el texto → etiqueta "TERMINÓ" y borde tenue |
| 8.7.j | La hora "7:30 a. m." se partía en dos | La hora trae un espacio especial (` `) → separar con `\s` |
| 8.7.j | "Property 'destacada' doesn't exist" al abrir el Perfil | Prop agregada al tipo pero no recibida → regla: correr `tsc --noEmit` tras cada cambio grande |
| 8.8 | En portugués la hora no muestra a. m./p. m. | Es el formato normal de Brasil (24 h): se dejó así a propósito |
| 8.10 | El panel no se actualiza solo en la moderación (hay que dar F5) | Anotado para la Fase 9 (9.4): sospecha, la suplantación del superadmin en Socket.io |
| 8.10 | Cambiar de congreso desde el Perfil no se reflejaba hasta reabrir la app; luego, ida sí y vuelta no | Dos causas en la navegación: las pestañas no se redibujaban y guardaban los parámetros viejos → cada pestaña lee el congreso del contexto (GUIA § 29.2) |

### 4.2. Prueba en teléfono real: notificaciones push (8.9)

Expo Go no recibe notificaciones push en Android, así que se compiló la app
(*development build* con EAS) y se probó en un Android real (12-nov-2026):

- ✅ La app se instaló con su ícono y su splash.
- ✅ Al entrar pidió permiso de notificaciones y registró el teléfono.
- ✅ Con la app en segundo plano, un aviso enviado desde el panel **llegó a la
  barra de notificaciones** con el ícono de Nexvio.
- ✅ Al tocarlo abrió la pantalla de Avisos.

La compilación tuvo dos tropiezos, resueltos: pnpm 11 exigía Node 22.13 en
los servidores de EAS, y Reanimated 4.6 (traída por NativeWind) era
incompatible con React Native 0.81 → se fijó 4.1.7 (GUIA § 30.3).

### 4.3. Validación con el cliente

| Fecha | Instancia | Resultado |
|---|---|---|
| sep-2026 | Reunión con el cliente | Redefinió la Fase 8 (registro por Excel, roles, panel del administrador) |
| oct-2026 | Demostración en la feria | Preparación y demostración del panel y la app |
| 7-nov-2026 | Reunión de validación | Producto aprobado; 5 ajustes solicitados (decisiones 38–41), implementados en el bloque 8.10 y verificados con la prueba 29 |

### 4.4. Pruebas de despliegue (9.7, 13-nov-2026)

- ✅ El backend desplegado en Render responde (`/` → "Hello World!").
- ✅ El panel desplegado en Vercel inicia sesión y muestra los datos reales
  (Panorama del superadmin con todas las organizaciones).
- ✅ La app usa el backend desplegado (`EXPO_PUBLIC_API_URL`) y el tiempo real
  funciona entre app y panel.
- Antes del despliegue se probó el arranque de producción en local
  (`start:prod`), lo que destapó que apuntaba a un archivo inexistente
  (`dist/main` en vez de `dist/src/main`): se corrigió.

---

## 5. Pruebas de carga

### 5.1. Por qué y con qué meta (decisión 48)

El plan original decía "120+ usuarios". Sebastián lo subió: los congresos a los
que apunta Nexvio son grandes y **no puede colgarse en un evento importante**.

**Meta: 900 asistentes simultáneos** (con pico de ~1.000 para tener margen).

**Concurrencia vs. carga:** concurrencia es cuántas personas usan el sistema
*al mismo tiempo*; carga es cuánto *trabajo* generan. 900 leyendo la agenda es
mucha concurrencia y poca carga; 700 votando en 30 s es muchísima carga. Por
eso se diseñaron **escenarios** que imitan momentos reales del congreso.

### 5.2. Criterios de aprobado

| Criterio | Umbral | Por qué |
|---|---|---|
| Tiempo de respuesta | **95 % de las respuestas en < 1 segundo** (p95 < 1 s) | Por encima de 1 s el usuario percibe lentitud |
| Errores | **< 1 %** de peticiones fallidas | El sistema no debe perder acciones |
| Estabilidad | **Ninguna caída** del backend | No colgarse en el evento |
| Tiempo real (escenario B) | **≥ 99 %** logra entrar a la sala en vivo | Si no entra, no ve preguntas ni encuestas |

**p95** = el tiempo dentro del cual responde el 95 % de las peticiones (el 5 %
más lento queda por fuera). Es más honesto que el promedio, que esconde a los
que esperaron mucho.

### 5.3. Los tres escenarios

| Escenario | Simula | Cómo |
|---|---|---|
| **A · La llegada** (`k6/a_llegada.js`) | Los asistentes abren la app en los primeros minutos y la usan | N usuarios virtuales llegan en 3 min, usan la app 4 min (congreso, avisos, Mi agenda, una charla, con pausas de lectura) y se van en 1 min |
| **B · La charla estrella** (`k6/b_charla_estrella.js`) | Cientos en la misma charla, en vivo: el ponente abre una encuesta y casi todos votan; algunos preguntan | N conexiones **Socket.io reales** a la misma sala; se crea y abre una encuesta; cada uno vota una vez en ~40 s y 1 de cada 10 pregunta; **cada teléfono refresca al recibir un aviso**, como la app |
| **C · El pico por notificación** (`k6/c_pico.js`) | El organizador envía un aviso y todos abren la app a la vez | N usuarios llegan en una ventana de 30 s |

**Herramienta: k6** (Grafana, gratis). Se eligió porque escribe los escenarios
en JavaScript (el mismo lenguaje del proyecto), maneja miles de usuarios
virtuales desde un PC, permite medir WebSockets y **exporta un reporte HTML**
que sirve como evidencia.

### 5.4. Preparación de los datos

| Paso | Script | Qué hace |
|---|---|---|
| 1 | `prisma/carga/1_preparar.js` | Crea el congreso "Carga 900" con 6 charlas (una es la estrella) e **importa 900 asistentes ficticios por Excel**, en lotes de 150 |
| 2 | `prisma/carga/2_tokens.js` | Inicia sesión con los 900 **antes** de la prueba y acepta la política de datos por cada uno |
| — | `prisma/carga/9_limpiar.js` | Al final: borra el congreso y los 900 asistentes (base y Supabase Auth) |

**¿Por qué los tokens se sacan antes?** Si los usuarios virtuales iniciaran
sesión durante la prueba, se mediría a Supabase Auth (y su límite de inicios de
sesión), no a Nexvio.

### 5.5. Hallazgo 1 — La importación de Excel es lenta con volumen

**Qué se midió (12-nov-2026):** 900 asistentes en 6 lotes de 150 →
**900/900 sin un solo error**, pero **845,7 s en total (~940 ms por persona)**;
cada lote tardó entre 139 y 146 s.

**Causa (revisando el código):** `importacion.service.ts` crea las cuentas
**una por una, en serie**: por cada persona, crear la cuenta en Supabase Auth
(que además cifra la contraseña) y luego guardarla en la base. Una no empieza
hasta que termina la anterior.

**Por qué importa:** un Excel de 900 subido desde el panel tardaría ~14 min en
**una sola petición**, y el servidor la corta antes (Node a los 5 min; los
hosts de producción, antes aún). Hoy un archivo de ~300 personas ya está en
riesgo.

**Corrección planeada (tarea 9.11):** crear las cuentas con concurrencia
limitada (p. ej. 8 a la vez) y, mejor, importar **en segundo plano** con
progreso ("Importando 340 de 900…"). Se medirá de nuevo para comparar.

### 5.6. Hallazgo 2 — El límite de inicios de sesión de Supabase es por IP

**Qué pasó (12 y 13-nov-2026):** el primer intento de sacar los 900 tokens
logró 848 en 26 min, con muchos errores 429 ("demasiadas peticiones"). Se
mejoró el script (v2: de a 3 a la vez, pausa común de 30 s ante un 429 y
**reanudable**) y se subió temporalmente el límite en Supabase: **900/900 en
~29 min**, aún con pausas.

**Causa:** Supabase limita los inicios de sesión **por dirección IP**, y los
900 salían del mismo PC.

**¿Afecta a usuarios reales?** Normalmente no: cada teléfono tiene su IP y cada
persona inicia sesión **una sola vez** (la app recuerda la sesión). **Pero sí
en un caso real: el Wi-Fi del evento**, donde cientos de teléfonos salen a
internet con la MISMA IP pública. Si muchos entran a la vez, el límite podría
frenarlos.

**Corrección planeada (tarea 9.12):** dejar ese límite alto en producción y
asegurar que la app muestre un mensaje claro si llega a ocurrir.

### 5.7. Ensayo 1 — En el PC de desarrollo (13-nov-2026)

Backend en el PC (Bogotá) y base de datos en Supabase (Ohio, `us-east-2`).
Ensayo con números pequeños para validar los scripts.

| Escenario | Usuarios | Errores | p95 | Mínimo | Peticiones/s |
|---|---|---|---|---|---|
| A · llegada | 100 | **0 %** | 3,1 s ✗ | 407 ms | 12,9 |
| B · charla estrella | 200 | **0 %** | 21,4 s ✗ | 711 ms | 8,9 |
| C · pico | 100 | **0 %** | 2,8 s ✗ | 437 ms | 16,2 |

**Lectura:**
- ✅ **Estable:** 0 % de errores en todo; en B las 200 conexiones en vivo
  entraron a la sala.
- ✗ **Lento.** El dato clave es el **mínimo de ~400 ms**: aun sin nadie en
  fila, la petición más rápida tardaba casi medio segundo.

**Causa (Hallazgo 3):**
1. Cada ida y vuelta del backend (Bogotá) a la base (Ohio) tarda ~120 ms.
2. Cada petición hace ~10 idas y vueltas: por el aislamiento (RLS) cada
   consulta va en una transacción que fija la organización (`BEGIN`,
   `set_config`, consultas, `COMMIT`), y muchas rutas abren **dos**: la del
   "portero" (`AccesoCongresoGuard`: ¿estás inscrito?) y la del servicio.
3. El backend usa como máximo **15 conexiones** a la base. Si cada una queda
   ocupada ~1,2 s, el techo es ~13 peticiones/s: **justo lo que midió k6**.
4. En B, la fila llegó antes que la avalancha de refrescos: solo 181 avisos en
   vivo de ~40.000 posibles.

**Decisión:** desplegar el backend **en la misma región que la base** (Ohio)
antes de seguir midiendo, porque el ensayo local medía la distancia
Bogotá–Ohio, no a Nexvio (tarea 9.7, adelantada).

### 5.8. Ensayo 2 — Contra el backend desplegado en Render (13-nov-2026)

Backend en Render (Ohio, **plan gratis**: muy poco procesador), misma base.

| Escenario | Usuarios | Errores | p95 PC → **Render** | Criterio |
|---|---|---|---|---|
| A · llegada | 100 | 0 % | 3,1 s → **0,67 s** (promedio 0,28 s) | ✅ **Pasa** |
| B · charla estrella | 200 | 0 % | 21,4 s → **16,4 s** (entrar a la sala ~5 s) | ✗ |
| C · pico | 100 | 0 % | 2,8 s → **1,5 s** | ✗ (cerca) |

**Lectura:**
- ✅ **El despliegue junto a la base resolvió la navegación normal:** el
  escenario A pasó con holgura, casi **5 veces más rápido** en promedio.
- ✗ **El tiempo real (B) y los picos (C) siguen sin pasar.** Se suman la CPU
  mínima del plan gratis, las dos transacciones por petición y la
  **avalancha de refrescos**, que ya empezó a aparecer (626–773 avisos con
  solo 200 usuarios).

**Un error del script, no del sistema:** la primera corrida de B contra Render
dio **199 votos fallidos de 200**. Revisando: eran todos **409 "Ya votaste en
esta encuesta"**, porque el escenario reutilizó la misma encuesta y los mismos
asistentes del ensayo local, que ya habían votado. **El backend hizo lo
correcto** (un voto por persona). Se corrigió el script: **cada corrida crea
una encuesta nueva**, y la repetición dio 0 % de errores (la tabla de arriba).

### 5.9. La avalancha de refrescos (el riesgo del tiempo real)

El tiempo real funciona con el patrón **"avisar y refrescar"**: cuando alguien
vota, el servidor avisa a todos los de la sala y **cada teléfono vuelve a
pedir** los resultados. Con 20 personas no se nota; con 700, **cada voto
genera 700 pedidos**, y si votan 700, son ~490.000 pedidos en medio minuto.
Lo mismo con las preguntas: ahora que son privadas (decisión 39), cada pregunta
nueva hace que todos refresquen su lista aunque no les cambie nada.

**Corrección planeada (9.13):** agrupar los avisos (máximo uno por segundo por
sala) y/o mandar los resultados dentro del aviso para que nadie tenga que
volver a pedirlos; los avisos de preguntas, solo a quien le interesa.

### 5.10. Optimizaciones 9.13 y su medición (13-nov-2026)

**Qué se cambió (código):**

| Cambio | Antes | Después |
|---|---|---|
| **Portero con memoria** (`acceso/cache-acceso.ts`) | Cada petición de un asistente a una charla abría hasta **3 transacciones** (2 del portero + 1 del servicio) | Las respuestas del portero se recuerdan (charla→congreso 10 min; "está inscrito" 30 s, solo los "sí"); lo que falte va en **1** transacción. Al salir de un congreso (quitarlo, suprimir, borrar el congreso) la memoria se borra **al instante** |
| **Avisos de preguntas dirigidos** | Cada pregunta avisaba a **toda la sala** (700 refrescos por pregunta) | Solo al **autor** (sala personal `usuario:<id>`) y al **staff** (`sesion:<id>:staff`): las preguntas son privadas |
| **Avisos de encuestas agrupados y con resultados** | Cada voto avisaba a toda la sala y **cada teléfono volvía a pedir** los resultados | Máximo **1 aviso por segundo** por charla y **con los resultados adentro**: la app actualiza las barras sin pedir nada; al votar usa la respuesta del servidor |

Pruebas de regresión en verde tras el cambio: 8.7.b (portero), 8.7.c
(suprimir corta el acceso), 8.10 y las de tiempo real y encuestas de la Fase 5.

**Medición en Render (plan gratis):**

| Escenario | Antes de 9.13 | Después de 9.13 | Criterio |
|---|---|---|---|
| **C · pico (100)** | p95 1,5 s | **p95 0,53 s**, 0 % errores | ✅ **Pasa** |
| **B · charla (200)** | p95 16,4 s, 1.247 peticiones | **0 % errores**, 4.622 avisos en vivo (**4.600 con resultados**: nadie tuvo que volver a pedirlos), **648 peticiones** (la mitad, con mucha más actividad); p95 12,2 s | ✗ (latencia) |

**Lectura del B:**
- ✅ **La avalancha de refrescos quedó resuelta**: el trabajo que recibe el
  backend ya no crece con el número de personas en la sala.
- ✗ **La latencia que queda es de CPU del plan gratis.** Con ~10 peticiones/s
  las respuestas tardan segundos: el plan free de Render da una fracción
  mínima de un procesador para atender a la vez 200 conexiones en vivo,
  verificar la firma de cada token y procesar cada petición. No es un
  problema de la base (el pool ya no se satura) ni del diseño. **Se valida en
  la medición oficial con un plan pago.**
- Una corrida intermedia dio **27 % de errores** justo después de publicar el
  cambio; repetida con el diagnóstico de códigos de error activado, dio
  **0 %**. No se reprodujo; lo más probable es que coincidiera con el cambio
  de instancia del despliegue. Queda anotado.

### 5.11. Qué falta en las pruebas de carga

1. ~~9.13 · Optimizaciones~~ ✅ (§ 5.10).
2. **9.11 · Importación rápida** → re-medir.
3. **Medición oficial con 900** con Render en un plan pago unos días (el
   gratis tiene muy poco procesador: mediría los límites del plan, no a
   Nexvio).

---

## 6. Revisión de seguridad (pendiente: tarea 9.2)

Se hará con la lista **OWASP Top 10** (las 10 categorías de vulnerabilidades
web más comunes), cuando las correcciones de la Fase 9 estén hechas, para
documentar el estado final: qué se revisó, qué se encontró, su severidad y cómo
se corrigió.

**Controles de seguridad que ya existen y que las pruebas verifican:**

| Control | Dónde se prueba |
|---|---|
| Aislamiento por organización en la base (RLS) y conexión sin privilegios | § 3 y pruebas 2, 3, 11 |
| Autenticación obligatoria (401 sin token) | Pruebas 1, 3, 4, 28 |
| Autorización por rol (403) | Pruebas 5, 6, 7, 18, 29 |
| "Solo su congreso" (404 para no confirmar que existe) | Prueba 20 |
| Suplantación del superadmin sin apagar el RLS | Prueba 12 |
| Contraseñas como hash irreversible; temporal + cambio obligatorio | Pruebas 13, 19 |
| Ley 1581: autorización versionada, revocar, suprimir | Pruebas 19, 21 |
| Minimización de datos (edad sin año, sin datos privados en el networking) | Pruebas 22, 26 |

**Riesgos ya identificados para la revisión:** límite de intentos en el login
por usuario (9.3), límite de Supabase por IP en el Wi-Fi del evento (9.12) y
Socket.io con la suplantación del superadmin (9.4).

**Incidente de manejo de secretos (13-nov-2026):** durante el despliegue, un
pantallazo compartido mostró el archivo `.env` del backend con las contraseñas
de la base. Como medida preventiva **se rotaron las contraseñas** de los
usuarios `postgres` y `nexvio_app` y se actualizaron en el `.env` local y en
Render. Lección: no compartir pantallazos con archivos de secretos abiertos.

---

## 7. Decisiones tomadas sobre las pruebas

| Decisión | Por qué |
|---|---|
| Probar contra el sistema **real**, no contra simulaciones | Un verde significa que de verdad funciona |
| **Una prueba e2e por bloque**, requisito para darlo por terminado | Definición de Hecho; evita regresiones |
| Actualizar (no borrar) las pruebas cuando el cliente cambia una regla | Que la suite refleje siempre las reglas vigentes |
| Meta de carga de **900 simultáneos** (no 120) — decisión 48 | Tamaño real de los congresos objetivo |
| Criterios: **p95 < 1 s, < 1 % errores, sin caídas** | Umbrales medibles para la tesis |
| Tres escenarios (llegada, charla estrella, pico) | Imitar momentos reales, no solo "muchos usuarios" |
| **k6** como herramienta | JavaScript, WebSockets, reporte HTML como evidencia |
| Sacar los tokens **antes** de la carga | Medir a Nexvio, no a Supabase Auth |
| Ensayar primero en pequeño y en local | Validar los scripts antes de la medición oficial |
| Medir oficialmente **contra el sistema desplegado** | El local mide la distancia Bogotá–Ohio, no a Nexvio |
| Desplegar el backend **junto a la base** (Ohio) | Bajar cada ida y vuelta de ~120 ms a ~1–2 ms |
| Plan gratis para el día a día; **pago solo para la medición oficial** | El gratis tiene muy poca CPU: mediría el plan, no el sistema |
| Una encuesta nueva por corrida del escenario B | Mediciones limpias y repetibles |
| Cada hallazgo se mide de nuevo tras corregirlo | Evidencia de antes/después |

---

## 8. Ajustes TEMPORALES a revertir al terminar la Fase 9

| Dónde | Ajuste | Valor de prueba | Volver a |
|---|---|---|---|
| Supabase → vida del token (JWT expiry) | Tokens duran todo el día | 86400 s | **3600 s** |
| Supabase → Rate Limits → sign-ins | Permitir 900 inicios de sesión | 2000 | Valor de producción decidido en la 9.12 |
| Render → plan del backend | (Cuando se haga la medición oficial) | Pago | Free |
| Base de datos | Congreso "Carga 900" y sus 900 asistentes | — | Borrar con `9_limpiar.js` |

---

## 9. Evidencias (para el Anexo 5)

| Evidencia | Dónde |
|---|---|
| Salida en verde de las pruebas e2e | Capturas de la terminal (sección 5 del documento) |
| Pruebas de aislamiento | Capturas del SQL Editor (pasos 2–4) y de `rls_via_app.js` |
| Reportes HTML de k6 (ensayo local) | `apps/backend/prisma/carga/reportes/ensayo_a.html`, `ensayo_b.html`, `ensayo_c.html` |
| Reportes HTML de k6 (Render) | `reportes/render_a.html`, `render_b.html` (con el error del script), `render_b2.html` (limpio), `render_c.html` |
| Reportes HTML de k6 (después de 9.13) | `reportes/render_b3.html` (corrida con 27 % de errores no reproducida), `render_b4.html` (0 % errores), `render_c2.html` (C pasa) |
| Historial del repositorio | GitHub: commits por bloque (`feat(8.x)…`, `test(9.1)…`) |
| Notificación push en teléfono real | Prueba manual del 8.9 (captura recomendada) |
| Acta de validación del cliente | Reunión del 7-nov-2026 (decisiones 38–41) |

---

## 10. Cómo reproducir las pruebas de carga

Desde `apps/backend` (backend encendido o desplegado):
```bash
node prisma/carga/1_preparar.js <orgEmail> <orgPass> 900   # una vez
node prisma/carga/2_tokens.js <orgEmail> <orgPass>          # antes de medir
```
Desde `apps/backend/prisma/carga` (para el desplegado, agregar
`-e API_URL=https://nexvio-backend.onrender.com`):
```bash
k6 run -e N=100 --out web-dashboard=export=reportes/a.html k6/a_llegada.js
k6 run -e N=200 -e SEG=60 --out web-dashboard=export=reportes/b.html k6/b_charla_estrella.js
k6 run -e N=100 --out web-dashboard=export=reportes/c.html k6/c_pico.js
```
Al terminar todo: `node prisma/carga/9_limpiar.js <orgEmail> <orgPass>`.

---

## 11. Glosario rápido

| Término | Significado |
|---|---|
| **e2e** (extremo a extremo) | Prueba que recorre un flujo completo contra el sistema real |
| **RLS** | *Row Level Security*: la base filtra las filas por organización |
| **VU** (usuario virtual) | Un "asistente simulado" de k6 |
| **p95** | Tiempo dentro del cual responde el 95 % de las peticiones |
| **Concurrencia** | Cuántos usan el sistema al mismo tiempo |
| **Carga** | Cuánto trabajo generan (peticiones por segundo) |
| **Throughput** | Peticiones que el sistema atiende por segundo |
| **429** | "Demasiadas peticiones": un límite de uso |
| **409** | "Conflicto": p. ej. votar dos veces |
| **Pool de conexiones** | Cuántas conexiones simultáneas a la base usa el backend |
| **Avalancha de refrescos** | Muchos teléfonos pidiendo lo mismo a la vez tras un aviso en vivo |
