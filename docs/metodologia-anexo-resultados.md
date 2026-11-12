# Secciones 2, 3 y 4

---

# SECCIÓN 2 · Metodología de desarrollo

> Va en *Descripción de la intervención*, como nueva sección después de
> *Justificación de las tecnologías*.

## Marco de trabajo adoptado

El desarrollo de Nexvio se conduce bajo **Scrum**, marco ágil que organiza el trabajo
en ciclos cortos con un incremento demostrable al cierre de cada uno. Se eligió sobre
alternativas como XP o Kanban puro por tres razones: permite alinear las entregas con
los cortes académicos del programa, mantiene informados al director y al cliente con
una cadencia fija, y aporta estructura suficiente para un equipo reducido sin generar
sobrecarga administrativa.

Frente a un modelo secuencial como cascada, Scrum resultaba más adecuado porque los
requisitos del cliente admitían refinamiento durante el desarrollo. El proyecto lo
confirmó: Grupo Studio Sebia solicitó «ver las credenciales de los asistentes», y al
construir la funcionalidad se evidenció que las contraseñas se almacenan cifradas de
forma irreversible y no pueden consultarse. El requisito se sustituyó dentro del mismo
sprint por restablecimiento de contraseña y descarga de un listado de acceso. En un
modelo secuencial, ese hallazgo habría aparecido en la fase de pruebas.

## Adaptación a las condiciones del proyecto

El equipo lo conforman dos estudiantes con dedicación parcial, lo que obligó a adaptar
el marco en lugar de aplicarlo literalmente:

- **Sprints de duración variable**, entre una y cinco semanas según la complejidad de
  la fase, en vez de ciclos uniformes.
- **Ceremonias reducidas** a planificación, revisión y retrospectiva. No se realizan
  reuniones diarias, poco útiles con un equipo de dos personas en dedicación parcial.
- **Kanban para el seguimiento diario**, con tareas en tres estados: pendiente, en
  progreso y completado.
- **Revisión cruzada obligatoria** en GitHub antes de incorporar cambios a la rama
  principal, como sustituto del control que en un equipo mayor ejercería el rol de
  revisor dedicado.

## Estructura temporal

El proyecto abarca **25 semanas distribuidas en ocho sprints**, con hitos de control en
las semanas 15 y 25 alineados con las evaluaciones académicas. El detalle se presenta
en el Anexo «Gestión de proyectos».

## Definición de «Hecho»

Un entregable se considera terminado solo si cumple las cuatro condiciones siguientes.
Si falla alguna, permanece en progreso con independencia del trabajo invertido:

1. Código incorporado a la rama principal del repositorio.
2. Prueba automatizada de extremo a extremo del flujo completo, en verde.
3. Procedimiento documentado en la guía de desarrollo.
4. Funcionalidad demostrable en ejecución ante el director o el cliente.

## Medición del avance

El avance se mide en **entregables verificables** —funcionalidades que el usuario
ejecuta de principio a fin—, no en tareas internas. Cada entregable admite tres
estados: no iniciado (0 %), en progreso (50 %) y terminado (100 %). Se descartan las
estimaciones de grano fino porque no admiten verificación externa.

El porcentaje global es el promedio de esos estados ponderado por las semanas del
sprint correspondiente, redondeado a la decena. Se recalcula al cierre de cada sprint y
se sustenta en evidencia consultable: historial del repositorio, salida de las pruebas
automatizadas, bitácora de desarrollo y actas de revisión con el cliente.

Las diferencias respecto al cronograma se clasifican en **desviación de ritmo**, cuando
el trabajo planificado no se completó a tiempo y compromete la fecha de cierre, y
**desviación de alcance**, cuando se ejecutó trabajo distinto por repriorización
acordada con el cliente, lo que reordena los sprints sin alterar el total.

---

# SECCIÓN 3 · Anexo «Gestión de proyectos»

## A.1 Equipo y roles

| Integrante | Rol | Responsabilidad |
|---|---|---|
| Sebastián Durán Forero | Desarrollador · Product Owner técnico | Arquitectura, backend, base de datos y relación con el cliente |
| María José Galindo Piñeros | Desarrolladora | Interfaces web y móvil, documentación |
| Luis Alejandro López Ballén | Director | Revisión académica y validación de entregas |
| Roberto Alejandro Durán López | Representante del cliente | Validación funcional y priorización del backlog |

## A.2 Estructura de desglose del trabajo (EDT)

| Fase | Paquetes de trabajo |
|---|---|
| 1. Análisis | Requisitos, historias de usuario, criterios de aceptación |
| 2. Diseño | Arquitectura, modelo de datos, prototipos, identidad visual |
| 3. Construcción | Infraestructura, autenticación, congresos, asistentes, agenda, tiempo real, networking |
| 4. Pruebas y cierre | Pruebas de extremo a extremo, despliegue, documentación, sustentación |

## A.3 Cronograma de sprints

| Sprint | Semanas | Duración | Enfoque principal |
|---|---|---|---|
| 1 | S1–S2 | 2 sem | Análisis de requerimientos y documentación |
| 2 | S3–S5 | 3 sem | Diseño de arquitectura y prototipos |
| 3 | S6–S8 | 3 sem | Infraestructura base y autenticación |
| 4 | S9–S11 | 3 sem | Gestión de congresos y agenda |
| 5 | S12–S14 | 3 sem | Panel administrativo, mensajería y participación en vivo |
| 6 | S15 | 1 sem | Revisión integral · Hito semana 15 |
| 7 | S16–S20 | 5 sem | Networking, analíticas y personalización visual |
| 8 | S21–S25 | 5 sem | Pruebas, documentación y despliegue · Hito de cierre |

## A.4 Product Backlog

Prioridad: **A** alta, **M** media, **B** baja.

| # | Historia de usuario | Sprint | Prior. | Estado |
|---|---|---|---|---|
| 1 | Como superadministrador quiero crear organizaciones para dar de alta nuevos clientes | 3 | A | Terminado |
| 2 | Como usuario quiero iniciar sesión de forma segura según mi rol | 3 | A | Terminado |
| 3 | Como organizador quiero que mis datos sean invisibles para otras organizaciones | 3 | A | Terminado |
| 4 | Como superadministrador quiero operar dentro de cualquier organización | 4 | A | Terminado |
| 5 | Como organizador quiero crear y configurar un congreso | 4 | A | Terminado |
| 6 | Como organizador quiero cargar asistentes masivamente desde Excel | 5 | A | Terminado |
| 7 | Como organizador quiero entregar credenciales de acceso a los asistentes | 5 | A | Terminado |
| 8 | Como asistente quiero iniciar sesión con mi nombre de usuario | 5 | A | Terminado |
| 9 | Como organizador quiero gestionar la agenda y los ponentes | 4 | A | Terminado |
| 10 | Como asistente quiero consultar la agenda desde la aplicación móvil | 5 | A | Terminado |
| 11 | Como asistente quiero participar en preguntas y encuestas en vivo | 5 | M | Terminado |
| 12 | Como organizador quiero personalizar la identidad visual de cada congreso | 7 | M | Terminado |
| 13 | Como asistente quiero recibir notificaciones del evento | 7 | M | En progreso ¹ |
| 14 | Como asistente quiero conectar con otros participantes | 7 | B | Terminado |
| 15 | Como organizador quiero consultar analíticas del congreso | 7 | B | En progreso ² |
| 16 | Como asistente quiero conocer y controlar el tratamiento de mis datos personales (Ley 1581) | 7 | A | Terminado ³ |
| 17 | Como asistente quiero marcar las charlas que me interesan y verlas en mi agenda | 7 | M | Terminado ³ |
| 18 | Como organizador quiero mostrar a los patrocinadores del congreso y de cada charla | 7 | M | Terminado ³ |
| 19 | Como asistente internacional quiero usar la aplicación en mi idioma (español, inglés o portugués) | 7 | M | Terminado ³ |
| 20 | Como asistente quiero resolver mis dudas por WhatsApp con un agente de IA | 5 | M | No iniciado ⁴ |

¹ El envío desde el panel y la bandeja de avisos en la app funcionan y tienen
prueba automatizada; falta la demostración de la notificación push en un
teléfono real, que requiere compilar la aplicación (development build).
² Existen indicadores básicos (inscritos por congreso, charlas marcadas por los
asistentes, preguntas por estado, panorama del superadministrador); falta un
tablero de analíticas propiamente dicho.
³ Entregables incorporados durante el desarrollo por solicitud del cliente o
por exigencia legal.
⁴ Corresponde a la bandeja omnicanal con agente de IA. Por priorización
acordada con el cliente (reunión de septiembre de 2026) se trasladó al final
del proyecto.

## A.5 Plan de comunicaciones

| Interlocutor | Canal | Frecuencia | Propósito |
|---|---|---|---|
| Director | Reunión y correo | Quincenal | Revisión académica del avance |
| Cliente | Reunión y demostración | Al cierre de sprint | Validación funcional y priorización |
| Equipo interno | GitHub y mensajería | Continua | Coordinación y revisión de código |

## A.6 Riesgos

Probabilidad e impacto: **A** alto, **M** medio, **B** bajo.

| Categoría | Riesgo | Prob. | Imp. | Mitigación |
|---|---|---|---|---|
| Recursos humanos | Carga académica paralela de los desarrolladores | A | M | Semana de margen por sprint y priorización de tareas críticas |
| Recursos humanos | Desalineación técnica entre los integrantes | M | M | Reuniones de sincronización y revisión cruzada de código |
| Técnico | Fuga de datos entre organizaciones | B | A | Aislamiento en el motor de datos y pruebas automatizadas de aislamiento |
| Alcance | Cambios de requisitos del cliente | A | M | Revisión al cierre de cada sprint y backlog priorizado |
| Despliegue | Fallas del ambiente de producción en la demostración final | B | A | Despliegue progresivo desde el sprint 8 con plan de reversión |
| Despliegue | Pérdida o corrupción de datos | B | A | Copias de seguridad diarias y alertas de monitoreo |
| Operación | Caída del servicio durante un congreso en curso | B | A | Escalado automático y recuperación en menos de 15 minutos |

## A.7 Presupuesto

**CAPEX** — inversión durante las 25 semanas, con tarifa de referencia de $40.000 COP
por hora para desarrollador junior en Bogotá:

| Recurso | Cálculo | Costo |
|---|---|---|
| Talento humano | 2 desarrolladores × 20 h/sem × 25 sem × $40.000 | $40.000.000 |
| Infraestructura de desarrollo | Planes gratuitos de Supabase, Upstash y Vercel | $0 |
| Herramientas | GitHub, Expo y Canva en plan gratuito o educativo | $0 |
| **Total CAPEX** | | **$40.000.000** |

**OPEX** — costos mensuales en producción. *Completar con las tarifas vigentes al
momento del despliegue.*

| Concepto | Costo mensual estimado |
|---|---|
| Base de datos y autenticación (Supabase) | *por definir* |
| Caché y pub/sub (Upstash) | *por definir* |
| Alojamiento del panel web | *por definir* |
| Servicios de inteligencia artificial | *por definir* |

---

# SECCIÓN 4 · Resultados · Estado actual

> Actualizado al 7 de noviembre de 2026. La versión anterior (octubre de 2026,
> sprint 5, 60 %) corresponde al informe de avance del hito de la semana 15.

Al 7 de noviembre de 2026 el proyecto se encuentra en el **sprint 7**, con un
avance global estimado del **90 %**, calculado con el método descrito en
*Metodología de desarrollo* sobre los entregables de la tabla A.4: 17 terminados,
2 en progreso y 1 no iniciado. El cálculo se mantiene en 90 % tanto con los 20
entregables como con los 15 del backlog original.

Desde el hito de la semana 15 se completaron la gestión de la agenda y los
ponentes, la consulta de la agenda en la aplicación móvil, la participación en
vivo, la personalización visual de cada congreso y el networking entre
asistentes. Durante el mismo periodo se incorporaron cuatro entregables que no
estaban en el backlog inicial: el cumplimiento de la Ley 1581 de 2012 dentro de
la aplicación (autorización versionada, revocatoria y solicitud de supresión),
la agenda personal de charlas favoritas, los patrocinadores por congreso y por
charla, y la aplicación en tres idiomas. En la reunión de revisión con el
cliente del 7 de noviembre se validó el producto y se solicitaron ajustes
menores, que se incorporaron en el mismo sprint.

Quedan pendientes la demostración de las notificaciones en un teléfono real,
que requiere compilar la aplicación; un tablero de analíticas, del que hoy
existen indicadores básicos; y la bandeja de WhatsApp con agente de IA. Esta
última es una **desviación de alcance** y no de ritmo: en la reunión de
septiembre de 2026 el cliente priorizó el panel del administrador y la
aplicación completa, y la mensajería se trasladó al final del proyecto. El
sprint 8 conserva las pruebas de carga y seguridad, el despliegue y la
documentación final, que no forman parte del backlog de historias de usuario y
se miden aparte.

El detalle de entregables y su estado se presenta en el Anexo «Gestión de
proyectos», tabla A.4.
