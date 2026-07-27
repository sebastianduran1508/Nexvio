OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 1 de 21
Nexvio: Plataforma de Gestión Centralizada de Congresos y
TÍTULO DEL PROYECTO
Eventos para Organizaciones
mjgalindonbos
NOMBRE DE LOS María José Galindo Piñeros que.edu.co
E-MAIL
PROPONENTES Sebastián Duran Forero Sduranfo@unb
osque.edu.co
lalopezb@unbo
DIRECTOR/TUTOR Luis Alejando López Ballen E-MAIL sque.edu.co
Ingeniería de Software
ÁREA DISCIPLINAR
ORGANIZACIÓN
Grupo Studio Sebia
BENEFICIARIA
REPRESENTANTE DEL
Roberto Alejandro Duran López
BENEFICIARIO

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 2 de 21
Tabla de contenido
1. OBJETIVOS ................................................................................................................................................ 2
2. SITUACIÓN IDENTIFICADA A INTERVENIR ...................................................................................... 3
3. ANÁLISIS DESDE EL MODELO BIOPSICOSOCIAL Y CULTURAL................................................. 5
4. ANTECEDENTES Y ESTADO DEL ARTE............................................................................................. 6
5. RESULTADOS ESPERADOS CON ENTREGABLES Y ANEXOS ........................................................ 8
6. GESTIÓN DEL PROYECTO Y DEL PRODUCTO ................................................................................ 10
6.3. PLAN DE COMUNICACIONES........................................................................................................... 14
6.7. RIESGOS ................................................................................................................................................ 15
6.8. ACERCA DEL PRODUCTO ................................................................................................................ 16
7. PROPIEDAD INTELECTUAL ................................................................................................................. 18
8. REFERENCIAS ......................................................................................................................................... 19
1. OBJETIVOS
Los siguientes objetivos definen el alcance y las fases de Nexvio, organizados bajo la metodología
Scrum en sprints iterativos con entregables fases por fase.

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 3 de 21
1.1 Objetivo general
Desarrollar Nexvio, una plataforma de software para la gestion de congresos y eventos de Grupo
Studio Sebia, que permita administrar múltiples eventos de forma centralizada desde una aplicación
móvil y un panel web, integrando participación en tiempo real, conexión entre asistentes y atención
automatizada por canales de mensajería con apoyo de inteligencia artificial.
1.2 Objetivos Específicos
I. Analizar los diferentes procesos actuales de gestión de eventos de Grupo Studio Sebia,
mediante el levantamiento de requerimientos con la organización, documentados a través
de historias de usuario, para identificar las necesidades del sistema y definir el alcance de
Nexvio.
II. Diseñar la arquitectura técnica de Nexvio, mediante la aplicación del modelo C4,
garantizando que los datos de cada organización y congreso permanezcan completamente
separados entre sí, y que el sistema pueda crecer sin comprometer su estabilidad.
III. Construir los módulos funcionales de Nexvio, incluyendo autenticación, gestión de eventos,
aplicación móvil para asistentes, conexión entre participantes, mensajería omnicanal y
métricas de participación, siguiendo el plan de sprints definido en Scrum para cubrir los
requerimientos aprobados en la fase de análisis.
IV. Evaluar el funcionamiento de Nexvio a través de una prueba piloto en un evento real del
Grupo Studio Sebia, aplicando pruebas de rendimiento, seguridad y aceptación de parte de
los usuarios reales, para verificar que el sistema cumple con los objetivos definidos y las
variables de control establecidas.
2. SITUACIÓN IDENTIFICADA A INTERVENIR
El contexto organizacional de Grupo Studio Sebia, es una agencia de innovación y soluciones
digitales con 13 años de experiencia, con sede principal en Bogotá, Colombia, y operación en
España. Su objeto social es el desarrollo de soluciones tecnológicas de alto impacto para empresas
y organizaciones, incluyendo desarrollo web, aplicaciones móviles, inteligencia artificial, realidad
virtual, eventos virtuales y streaming. Su actividad económica corresponde al sector de tecnología
de la información y las comunicaciones, clasificada bajo el código CIIU 6312- 6201 – 7310 del sector
económico de servicios digitales. La organización cuenta con un equipo de 7 profesionales y han
completados más de 124 proyectos para clientes en más de 9 países, entre ellos Universidad de la
Costa, Uniminuto, Grupo Bolívar y Legrand. Dentro de su portafolio, Grupo Studio Sebia ofrece el
servicio de producción y administración de eventos virtuales y streaming, que consiste en organizar,
transmitir y gestionar eventos en línea para sus clientes corporativos y académicos. Este servicio es
uno de los de mayor crecimiento dentro de la organización, dado el aumento sostenido de la
demanda de eventos híbridos y virtuales en el contexto latinoamericano post-pandemia.
El proceso identificado a intervenir es la gestión y producción de eventos virtuales en Grupo Studio
Sebia, este opera actualmente de forma manual y fragmentada. Para cada evento que la
organización produce, el equipo debe configurar desde cero herramientas dispersas: plataformas

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 4 de 21
independientes, formularios de registro en hojas de cálculo, grupos de WhatsApp para la atención a
organizadores y asistentes, correos electrónicos para distribución de agenda, y aplicaciones
separadas para encuestas en vivo. Este proceso involucra a varios roles dentro de la organización:
• Organizador del evento: Responsable de la planeación general, la agenda y la coordinación
con clientes y ponentes.
• Coordinador operativo: Encargado de la atención a los asistentes, moderación de preguntas
y soporte durante el evento en vivo.
• Equipo de comunicaciones: Gestiona los canales de WhatsApp, Instagram, correo
electrónico y Facebook del evento, respondiendo manualmente cada mensaje recibido.
• Asistentes: Participantes del evento que acceden atreves de múltiples canales sin una
experiencia en un solo lugar.
Este modelo representa desventajas significativas como el consumo de tiempo operativo en tareas
repetitivas, riesgo de pérdida de información por la dispersión de herramientas, imposibilidad de
escalar la operación cuando se gestionan múltiples eventos simultáneos, y ausencia de datos
consolidados que permitan medir el impacto real de cada evento. Adicionalmente, la atención por
redes sociales depende completamente de la disponibilidad del equipo humano, generando demoras
en la respuesta y experiencias inconsistentes para los asistentes.
A continuación, en la Figura 1 y Figura 2 se presenta el flujo actual del proceso de gestión de un
evento en Grupo Studio Sebia, previo a la intervención de Nexvio:
Fase 1. Preparación y planeación del evento
Figura 1. Proceso AS-IS Fase 1: Preparación y planeación del evento en Grupo Studio Sebia. Elaboración propia.
Fase 2. Ejecución, cierre y entrega del evento

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 5 de 21
Figura 2. Proceso actual AS-IS Fase 2: Ejecución, cierre y entrega del evento en Grupo Studio Sebia. Elaboración propia.
El proceso iniciando cuando un cliente contrata a Grupo Studio Sebia para producir un evento. El
equipo configura manualmente cada herramienta por separado, crea el formulario de registro, arma
la agenda en un documento compartido, configura la plataforma y crea los grupos de comunicación.
El día del evento, el coordinador atiene de manera simultánea las preguntas del público, los
mensajes entrantes por las distintas redes sociales, y la moderación del chat del evento, todo desde
aplicaciones distintas. Al finalizar, los datos de asistencia, participación y mensajes quedan dispersos
en múltiples plataformas, dificultando la generación de un reporte consolidado para el cliente.
Esta situación representa una oportunidad de mejora, la implementación de una plataforma
centralizada que unifique la gestión de cada congreso, automatice las tareas repetitivas mediante
inteligencia artificial y ofrezca a los asistentes una experiencia digital excelente y de alto valor,
permitiendo a Grupo Studio Sebia escalar su operación sin incrementar proporcionalmente su equipo
humano.
3. ANÁLISIS DESDE EL MODELO BIOPSICOSOCIAL Y CULTURAL
La Universidad El Bosque ve el modelo biopsicosocial y cultural (BPSC) como una forma de entender
al ser humano no simplemente como alguien que usa tecnología, sino como una persona con
características biológicas, psicológicas, sociales y culturales que se relacionan constantemente con la
tecnología dentro de un contexto [15]. Aplicar este modelo a Nexvio nos permite ir más allá de lo
técnico y entender cómo la plataforma puede afectar las condiciones de quienes participan en los
eventos y congresos.
Dimensión biológica: El coordinador operativo de un evento carga con una presión de trabajo bastante
alta al tener que atender al mismo tiempo múltiples pantallas, aplicaciones y canales de comunicación.
Esa sobrecarga genera fatiga, errores de atención y desgaste a lo largo de la jornada. Nexvio entra en
este punto al reunir todas las tareas en una interfaz, lo que le permitiría al coordinador trabajar con
mayor eficiencia.
Dimensión psicológica: Participar en un congreso no siempre es cómodo. Ya que muchas personas
pueden tener menor capacidad para interactuar en entornos con muchas más personas. Solo eso
reduce la cantidad de conexiones que se pueden hacer y así el valor real que el evento les aporta
disminuye. Los módulos de participación en vivo y el sistema de networking estilo match de Nexvio
ofrecen una alternativa más discreta para formar relaciones y contactos, lo que contribuye a esa
problemática y a que la participación sea más genuina. Para el coordinador y el organizador, poder ver

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 6 de 21
en tiempo real qué está pasando en el evento reduce considerablemente la incertidumbre y la tensión
operativa.
Dimensión social: Los congresos existen, en buena parte, para construir redes profesionales y
transferir conocimiento colectivo. Sin embargo, el modelo actual de Grupo Studio Sebia no facilita que
los asistentes se conecten entre sí más allá del evento mismo. Nexvio cambia esa dinámica: su
módulo de networking permite que personas que coincidieron en un congreso establezcan vínculos
profesionales que se extienden más allá del día del evento. A esto se suma que la bandeja omnicanal
con agente de inteligencia artificial democratiza el acceso a la información, sin importar por qué canal
prefiera comunicarse cada asistente.
Dimensión cultural: En Colombia y en gran parte de Latinoamérica, WhatsApp no es solo una
aplicación, es el canal por defecto de comunicación. Ignorar ese hábito e imponer una sola vía de
contacto genera fricción y, en la práctica, baja adopción. Nexvio no pretende cambiar esos
comportamientos; los respeta e integra. Los asistentes siguen usando la red social que prefieran,
mientras la plataforma centraliza y gestiona todo de forma inteligente en un solo lugar. Eso refleja uno
de los principios centrales del modelo BPSC: el artefacto tecnológico debe adaptarse al entorno
cultural de sus usuarios, no al revés.
Desde el modelo propuesto por Montaña en [15] para la ingeniería en la Universidad El Bosque,
Nexvio se analiza de la siguiente manera:
Figura 3. Modelo Biopsicosocial y Cultural (BPSC) aplicado a Nexvio. Adaptado de [15].
En cuanto a los criterios de selección del medio y representación del resultado, para la situación
intervenida se seleccionaron diagramas BPMN (Business Process Model and Notation) como medio
de representación, por tres criterios: su capacidad de mostrar roles y responsabilidades de forma
clara, su estandarización como notación reconocida en ingeniería de software, y su aptitud para
contrastar el estado actual (AS-IS) con el estado transformado (TO-BE). El resultado esperado de la
transformación es un equipo operativo con menor carga de trabajo, asistentes con mayor

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 7 de 21
participación e involucramiento, y una organización con datos consolidados para medir el impacto
de cada evento.
4. ANTECEDENTES Y ESTADO DEL ARTE
Para construir el estado del arte de Nexvio se realizó una revisión de literatura en IEEE Xplore,
Scopus y Google Scholar, complementada con documentación técnica oficial de las tecnologías
utilizadas y el análisis de plataformas comerciales existentes con funcionalidades similares. Se
consultaron fuentes publicadas entre 2019 y 2026 en inglés y español, disponibles en acceso abierto,
indexadas en bases de datos reconocidas y directamente relacionadas con los componentes del
sistema. Se excluyeron fuentes sin autor identificable, tecnologías sin mantenimiento activo,
contenidos duplicados y fuentes sin acceso libre disponible. Los resultados se organizaron en cuatro
categorías: arquitectura del sistema, seguridad y privacidad de los datos, plataformas similares, y
tecnologías y frameworks utilizados.
4.1. Categorías
A continuación, se presentan las cuatro categorías de literatura revisada, con los aportes más
relevantes para el diseño y desarrollo de Nexvio.
4.2.1. Categoría 1. Arquitectura del sistema
El diseño de plataformas de software que atienden simultáneamente a múltiples organizaciones
desde una infraestructura compartida ha sido ampliamente estudiado en la última década. Velepucha
y Flores en [1] y Soldani et al. en [2] documentan que este tipo de arquitecturas permiten reducir
costos operativos y escalar la capacidad del sistema sin duplicar la infraestructura, siempre que se
garantice el aislamiento completo de los datos de cada cliente. Pushpan en [6] y Golding en [7]
profundizan en los patrones concretos para lógralo, destacando la separación por esquemas en la
base de datos como el balance más adecuado entre aislamiento y costo. Dolzhenko en [3] aporta
evidencia practica sobre la implementación de este tipo de sistemas con las tecnologías que usa
Nexvio. Estos fundamentos respaldan directamente las decisiones de arquitectura del proyecto.
4.2.2. Categoría 2. Seguridad y privacidad de datos
Cuando una misma plataforma gestiona información de múltiples organizaciones, la protección de
datos se convierte en un requisito no negociable. Golding en [7] y Pushpan en [6] señalan que los
principales riesgos en este tipo de sistemas provienen de una separación de datos mal
implementada, y establecen como controles esenciales el cifrado de información, la autenticación
segura y el control de acceso diferenciado por rol. Estos lineamientos son especialmente relevantes
para Nexvio dado que la plataforma gestiona datos personales de asistentes como nombres, correos
e historial de mensajes, lo que la sujeta a la Ley 1581 de 2012 de protección de datos personales en
Colombia.
4.2.3. Categoría 3. Plataformas similares de gestion de eventos
Esta categoría analiza las soluciones existentes en el mercado para la gestion de eventos, con el fin
de identificar que ofrecen actualmente, cuáles son sus limitaciones y que necesidades no están
siendo cubiertas, lo que justifica la pertinencia y el enfoque de Nexvio.

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 8 de 21
Whova [17] es una plataforma estadounidense orientada a la gestion de eventos presenciales y
virtuales. Ofrece funcionalidades de registro de asistentes, agenda interactiva, transmisión en vivo,
networking entre asistentes, encuestas en tiempo real y análisis de participación. Está posicionada
principalmente en el mercado norteamericano y europeo, con casos de uso en conferencias
académicas y corporativas de gran escala. Eventtia [18] es una solución de origen colombiano con
presencia en Latinoamérica que permite gestionar el ciclo completo de un evento, desde el registro
hasta el análisis de resultados, con soporte para eventos híbridos y virtuales. Su propuesta de valor
está orientada a los organizadores independientes y empresas que producen sus propios eventos
de forma ocasional.
Ambas plataformas representan soluciones consolidadas dentro de su segmento. No obstante, el
análisis comparativo de Capterra [19] y Eventee [20] revela limitaciones estructurales frente al
modelo de operación de Grupo Studio Sebia como una agencia productora. En primer lugar, ninguna
de ellas está concebida para que un mismo operador gestione múltiples clientes y eventos de forma
simultánea desde un solo sistema, lo que obliga a configurar cada evento de forma independiente
sin reutilizaciones entre uno y otro, replicando exactamente el problema que Nexvio quiere resolver.
Como segundo lugar, ninguna de ellas integra de forma nativa los canales de mensajería de
WhatsApp, Instagram y Facebook en una bandeja unificada, canal que como señala la dimensión
cultural del modelo BPSC analizado en la sección 3, es el medio de comunicación por defecto en el
contexto latinoamericano. Por último, si bien Whova cuenta con funcionalidades básicas de
networking, ninguna ofrece un sistema de conexión entre asistentes basado en interés mutuo que
extienda los vínculos más allá del día del evento.
Esta comparativa confirma que existe una brecha en el mercado latinoamericano para agencias
productoras de eventos que necesitan una plataforma centralizada, configurable y reutilizables,
adaptada a los caneles de comunicaciones de la región. Nexvio se posiciona precisamente en ese
espacio no cubierto.
4.2.4. Categoría 4. Tecnologías y frameworks utilizados
En esta categoría se analizan y revisan las tecnologías disponibles para construir plataformas web
y móviles del tipo que requiere Nexvio, evaluando su vigencia, compatibilidad y adopción en
proyectos de escala productiva en los últimos 5 años.
Para el desarrollo de aplicaciones móviles multiplataforma frameworks como React Native [8] han
demostrado ser una alternativa viable frente al desarrollo nativo independiente para IOS y Android,
reduciendo tiempos y costos sin sacrificar rendimiento. Para el desarrollo del panel web, soluciones
como Next.js [21] permiten construir interfaces administrativas con renderizado optimizado y alto
rendimiento, siendo ampliamente adoptadas en aplicaciones de escala productiva En cuanto al
backend, frameworks orientados a la construcción de APIs modulares como NestJS [9] facilitan la
organización del código en servicios independientes y el soporte para comunicación en tiempo real,
características esenciales en sistemas que deben atender a múltiples usuarios simultáneos. La
comunicación en tiempo real entre el servidor y los clientes, necesaria para funcionalidades como
preguntas en vivo y notificaciones instantáneas, está ampliamente soportada por protocolos como
WebSocket, implementados en bibliotecas como Socket.io [10].

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 9 de 21
En cuanto a la gestion de datos, los sistemas de base de datos relacionales como PostgreSQL [11]
han evolucionado para soportar estrategias de separación de información entre organizaciones
dentro de una misma infraestructura, lo que los hace adecuados para plataformas que atienden
múltiples clientes. En cuanto al manejo de datos de alta frecuencia de acceso como sesiones
activas y estados en tiempo real, soluciones como Redis [22] ofrecen almacenamiento temporal de
alto rendimiento utilizado en sistemas de escala productiva y para la autenticación segura de
usuarios y el almacenamiento de archivos en la nube, servicios como AWS Cognito [12] y AWS S3
[13] ofrecen soluciones gestionadas con altos estándares de seguridad y disponibilidad.
Finalmente, para la integración con canales de mensajería como WhatsApp, Instagram y
Facebook, la Meta Business API [14] es actualmente la única vía oficial que permitir conectar
aplicaciones de terceros con estas plataformas de forma programática y a escala.
La selección de tecnología para Nexvio responde a criterios de vigencia, compatibilidad entre los
distintos componentes, disponibilidad de documentación oficial y acceso a planes gratuitos durante
la fase de desarrollo, garantizando la viabilidad técnica y económica el proyecto.
5. RESULTADOS ESPERADOS CON ENTREGABLES Y ANEXOS
Como se identificó anteriormente, Grupo Studio Sebia gestiona actualmente cada congreso con
herramientas dispersas, procesos manuales y sin reutilización tecnológica entre un evento y el otro
siguiente. Nexvio nace como respuesta directa a esta situación, con el objetivo de transformar ese
modelo fragmentado en un sistema centralizado, configurables y reutilizables
5.1. Descripcion del producto
Nexvio es una plataforma de software para la gestion centralizada de congresos y eventos, que
permite a Grupo Studio Sebia administrar múltiples organizaciones y eventos desde un único
sistema, garantizando que los datos de cada cliente permanezcan completamente separados entre
sí. Esto significa que, si Grupo Studio Sebia produce dos o más congresos simultáneamente para
dos o más clientes distintos, cada uno opera de forma independiente dentro de la plataforma, con
su propia configuración, sin que exista un punto de contacto entre ellos. La plataforma está
compuesta por dos productos integrados: una aplicación móvil para los asistentes y un panel web
para el equipo organizador.
5.1.1. Aplicación Movil
En cuanto a la aplicación móvil, es el espacio del asistente durante el evento. Está disponible para
Android y permite al participante consultar la agenda del congreso, enviar preguntas en tiempo real
durante las sesiones, responder encuestas lanzadas por el coordinador, conectarse con otros
asistentes a través del módulo de networking y recibir notificaciones relevantes del evento.
El módulo de networking funciona como un sistema de conexiones profesionales basado en
intereses en común. Un asistente puede expresar interés en conectar con otro participante y si el
interés es reciproco se habilita un chat entre ambos con un límite de mensajes establecido, con el
objetivo de incentivar que la conversación continue por canales externos. Esto permite que las
conexiones generadas durante el congreso se extiendan más allá del día del evento.
Cada organización que contrate el servicio a través de Grupo Studio Sebia puede personalizar la
apariencia de la aplicación móvil con su propia marca, entre estos podrá personalizar colores,
logos e información del congreso, generando una experiencia propia para sus asistentes sin
necesidad de desarrollar una aplicación desde cero. Esta personalización es configurada por el

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 10 de 21
equipo de Nexvio a través de un formulario guiado que explica paso a paso al organizador que
información ingresar. La configuración técnica final es realizada por los desarrolladores del sistema
con apoyo de herramientas de inteligencia artificial internas, lo que garantiza que el proceso sea
ágil, controlado y libre de errores de configuración por parte del cliente.
5.1.2. Panel Web
El panel web se encarga de centralizar toda la operación administrativa de la plataforma y tiene
tres vistas diferenciadas según el rol del usuario:
• El organizador accede a la gestion completa de su congreso: puede configurar la
información del evento, cargar la agenda, registrar ponentes y asistentes, y hacer
seguimiento general del congreso antes y durante su realización.
• El coordinador opera el evento en tiempo real, modera las preguntas que llegan desde la
aplicación móvil, antes de ser realizadas al ponente, gestiona las encuestas activas
durante las sesiones y atiende todos los mensajes que llegan por WhatsApp, Instagram y
Facebook desde una bandeja unificada, esta bandeja cuenta con apoyo de inteligencia
artificial para clasificar los mensajes entrantes y responder automáticamente las preguntas
frecuentes relacionadas con el evento, como horarios e información acerca del evento. Los
mensajes que el sistema no puede resolver de forma autónoma son escalados al
coordinados para atención humana.
• El administrador de Grupo Studio Sebia tiene acceso a una vista global desde la que
gestiona todos los congresos activos, administra los clientes registrados en el sistema y
consulta las métricas de control de la plataforma.
5.2. Impacto esperado
La implementación de Nexvio transforma la operación de Grupo Studio Sebia en tres dimensiones.
En lo operativo, elimina la necesidad de configurar herramientas separadas para cada evento y
centraliza la atención a asistentes en una sola interfaz, reduciendo significativamente la carga de
trabajo del equipo y el tiempo dedicado a tareas repetitivas. En lo comercial, Nexvio se convierte
en un nuevo servicio dentro del portafolio de Grupo Studio Sebia que puede ofrecerse a sus
clientes como parte de la producción del congreso, generando una fuente de ingresos recurrente
sin necesidad de aumentar el equipo. Por último, en lo estratégico posiciona a Grupo Studio Sebia
como una agencia con tecnología propia en un mercado donde la capacidad tecnológica es un
factor diferenciador frente a la competencia, especialmente en el segmento de eventos híbridos y
virtuales que sigue creciendo en Latinoamérica.
5.3. Prueba Piloto y variables de control
La validación del sistema se realiza en dos etapas complementarias que juntas demuestran tanto
el funcionamiento técnico de la plataforma como su viabilidad en un contexto de uso real.
La primera etapa es una prueba técnica controlada donde se configuran dos organizadores
diferentes operando al mismo tiempo dentro de la plataforma cada una con su propia información y
configuración. Esta etapa verifica tres aspectos fundamentales del sistema, primero que los datos
de una organización sean inaccesibles desde la otra. Segundo que el rendimiento sea adecuado
cuando ambas operan al mismo tiempo y tercero que los mecanismos de seguridad y autenticación
funcionan correctamente. Esta prueba se ejecuta durante el Sprint 8 con datos simulados pero
representativos de un congreso real.

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 11 de 21
La segunda etapa es una prueba de usabilidad con usuarios reales de Grupo Studio Sebia, que
involucra al menos un organizador, un coordinador y cinco asistentes interactuando con la
plataforma en un escenario lo más cercano posible a un congreso real. Allí se evalúan las cuatro
siguientes variables de control:
• El tiempo de configuración y activación de un nuevo congreso en Nexvio por parte del
equipo de desarrollo, incluyendo la personalización visual, carga de agenda, ponentes y
registros de asistentes no debe superar las 8 horas.
• La disponibilidad se mide durante la prueba verificando que la plataforma permanezca
operativa de forma continua, con una meta mayor o igual al 99%.
• La tasa de resolución autónoma del agente de inteligencia artificial se calcula sobre el total
de los mensajes recibidos en la bandeja unificada durante la prueba, con una meta mayor
o igual al 60%.
• El NPS se recolecta mediante una encuesta breve que aparece en la aplicación móvil al
finalizar el evento, con una meta mayor o igual a 70 puntos.
5.3. Entregables
Los entregables del proyecto se estructuran en cuatro fases definidas de acuerdo con el alcance
establecido y el plan de sprints de Scrum, estas son diseño, construcción y pruebas. El detalle
completo de cada entregable en su fase y sprint asociado se presenta en el Anexo adjuntado al
proyecto en la Tabla 1.
La tabla de entregables (Tabla 1) del proyecto se encuentra en el
anexo adjuntado al proyecto.
6. GESTIÓN DEL PROYECTO Y DEL PRODUCTO
La gestión de Nexvio integra los procesos de planificación, seguimiento y control necesarios para
garantizar que el desarrollo del producto avance de forma ordenada, dentro de los tiempos
establecidos y con un uso eficiente de los recursos disponibles. Esta sección documenta las
decisiones estructurales del proyecto: el alcance definido, la metodología de trabajo adoptada, la
distribución temporal de actividades, el presupuesto estimado, los canales de comunicación entre
los involucrados, los riesgos identificados y las características técnicas del producto.
6.1. ALCANCE DEL PROYECTO
La figura 4 presenta la estructura de desglose del trabajo del proyecto organizada por fases,
paquetes de trabajo, actividades principales y responsables

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 12 de 21
Figura 4. EDT.
6.2. TIEMPO Y PRESUPUESTO
La gestión y el desarrollo de Nexvio se apoya en la metodología Scrum, un marco de trabajo ágil
utilizado en el desarrollo de software que organiza el trabajo en ciclos cortos e iterativos
denominados sprints. A diferencia de metodologías secuenciales como el modelo de cascada,
Scrum permite revisar y ajustar el producto de forma continua, lo que resulta especialmente
adecuado para un proyecto como este, donde los requisitos pueden refinarse a lo largo del
desarrollo y donde la retroalimentación temprana de los involucrados es importante en las
decisiones de diseño e implementación.
La elección de Scrum sobre otras alternativas ágiles como Kanban o XP se hizo teniendo en
cuenta tres factores: primero, la necesidad de establecer entregas claras y periódicas que se
alineen con los cortes académicos del programa. Segundo, el mantener informados de los avances
a los distintos actores del proyecto. Tercero, la escala del equipo para la cual Scrum tiene una
estructura suficiente sin generar sobrecarga administrativa.
El proyecto se desarrolla a lo largo de 25 semanas, distribuidas en ocho sprints con duraciones
que varían entre dos y cinco semanas según la complejidad de cada fase. Esta sección detalla el
alcance del proyecto, la planificación temporal y presupuestal, el plan de comunicaciones, la
gestión de riesgos y la descripción técnica del producto.
6.2.1. Tiempo
El proyecto se desarrolla bajo la metodología Scrum, organizada en ocho sprints con duración
variable. Scrum permite planificar el trabajo en ciclos cortos con entregables concretos al final de
cada uno, lo que facilita la detección temprana de problemas y la adaptación del alcance según los

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 13 de 21
resultados obtenidos. Para complementar, dentro de cada sprint el equipo utiliza un tablero Kanban
para hacer seguimiento diario de las tareas, clasificando su estado entre pendiente, en progreso y
completado. Esta combinación de Scrum para la planificación por ciclos y Kanban para el
seguimiento diario responde a el modelo iterativo del desarrollo de software y permite mantener
visibilidad continua sobre el avance del proyecto.
El proyecto tiene una duración total de 25 semanas con dos hitos de control alineados con las
evaluaciones académicas en las semanas 15 y 25. La Tabla 2 resume la distribución de sprints y la
Tabla 3 presenta el cronograma en detalle.
La Tabla 2 presenta la distribución de sprints del proyecto Nexvio
Tabla 2. Distribución de sprints del proyecto Nexvio.
Sprint Semanas Duración Enfoque principal
Sprint 1 S1 a S2 2 semanas Análisis de requerimientos y documentación
Sprint 2 S3 a S5 3 semanas Diseño de arquitectura y prototipos
Sprint 3 S6 a S8 3 semanas Infraestructura base y autenticación
Sprint 4 S9 a S11 3 semanas Gestión de congresos y agenda
Panel administrativo, mensajería y participación en
Sprint 5 S12 a S14 3 semanas vivo
Sprint 6 S15 1 semana Revisión integral - Hito 70% Semana 15
Sprint 7 S16 a S20 5 semanas Networking, analíticas y personalización visual
Pruebas, documentación y despliegue - Hito Cierre
Sprint 8 S21 a S25 5 semanas Semana 25
El cronograma (Tabla 3) del proyecto se encuentra en el anexo
adjuntado al proyecto
6.2.2 Presupuesto
El presupuesto del proyecto se divide en dos componentes, el CAPEX que corresponde a la
inversión realizada durante las 25 semanas de desarrollo, y el OPEX que corresponde a los costos
operativos mensuales una vez la plataforma esté en producción.
Para la valoración del talento humano se toma como referencia la tarifa de mercado para un
desarrollador junior en Bogotá de $40.000 COP por hora, considerando que cada integrante del
equipo trabaja 20 horas semanal durante las 25 semanas del proyecto.
La Tabla 4 presenta los costos de inversión inicial requeridos para el desarrollo de Nexvio durante
las 25 semanas del proyecto.
Tabla 4. CAPEX Costos de inversión inicial del proyecto Nexvio
Recurso Descripcion Costo Total

|     |     |     | Código: F-040601 |     |
| --- | --- | --- | ---------------- | --- |
OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS
|     |     |     |     |     |
| --- | --- | --- | --- | --- |
Versión: 2, 20-05-

| MODALIDAD DESARROLLO  |     |     | 16  |     |
| --------------------- | --- | --- | --- | --- |

|     | TECNOLÓGICO  |     | Página:  14 de 21 |     |
| --- | ------------ | --- | ----------------- | --- |

Está formado por 2 desarrolladores, 20
hrs/semana c/u durante 25 semanas. Tarifa de
mercado para desarrollador junior-medio en
| Talento Humano   | Bogotá: $40.000 COP/hora  |     | $50.000.000 COP   |     |
| ---------------- | ------------------------- | --- | ----------------- | --- |
Servidor de desarrollo y staging (Railway), base de
datos PostgreSQL (Supabase) y cache Redis
(Upstash)  tier gratuito durante toda la fase de
| Infraestructura Cloud   | desarrollo   |     | $0 COP   |     |
| ----------------------- | ------------ | --- | -------- | --- |
AWS S3 free tier (5 GB), Figma Starter (gratuito
| Almacenamiento y  | para equipos de 2), GitHub plan gratuito para  |     |          |     |
| ----------------- | ---------------------------------------------- | --- | -------- | --- |
| Herramientas      | repositorios privados                          |     | $0 COP   |     |
Stack completo open source: React Native, Next.js
14, NestJS, PostgreSQL, Socket.io, Meta
Licencias de Software   Business API sin costo de licenciamiento   $0 COP
Conexión a internet de 2 personas durante 25
Internet  semanas a $50.000 COP mensuales por persona  600.000 COP
Consumo eléctrico estimado de 2 computadores
durante 25 semanas a $30.000 COP mensuales
| Servicios publicos  | por persona  |     | 360.000 COP  |     |
| ------------------- | ------------ | --- | ------------ | --- |
Desplazamientos al lugar de trabajo estimados en
2 días por semana durante 25 semanas para 2
| Transporte  | personas a $7.100 COP por día  |     | 710.000 COP  |     |
| ----------- | ------------------------------ | --- | ------------ | --- |
Depreciación proporcional de 2 computadores con
valor de $3.000.000 COP cada uno, calculada
sobre una vida útil de 3 años durante 6 meses de
| Depreciación de los equipos proyecto  |     |     | 500.000 COP  |     |
| ------------------------------------- | --- | --- | ------------ | --- |
Reserva para gastos no contemplados durante el
| Imprevistos (10%)  | desarrollo del proyecto  |     | 5.267.000 COP    |     |
| ------------------ | ------------------------ | --- | ---------------- | --- |
|  TOTAL             |                          |     | $57.937.000 COP  |     |

La Tabla 5 presenta los costos operativos mensuales estimados para mantener el proyecto Nexvio
en funcionamiento una vez desplegado en producción.

Tabla 5. OPEX Costos operativos mensuales estimados del proyecto Nexvio en producción.
| Recurso  |     | Descripción  | Precio COP/mes  |     |
| -------- | --- | ------------ | --------------- | --- |
Servidor Backend AWS EC2 Instancia con 2 vCPUs y 4 GB RAM para alojar el
| t3.medium              | backend NestJS en producción                        |     | $127.554 COP  |     |
| ---------------------- | --------------------------------------------------- | --- | ------------- | --- |
| Base de datos AWS RDS  | Base de datos relacional multi-tenant con 20 GB de  |     |               |     |
PostgreSQL db.t3.micro  almacenamiento en producción  $60.480 COP
| Caché AWS ElastiCache  | Nodo de caché para gestión de sesiones y  |     |              |     |
| ---------------------- | ----------------------------------------- | --- | ------------ | --- |
| cache.t3.micro         | comunicación en tiempo real               |     | $48.384 COP  |     |

|     |                                                 |     |     |     |      | Código: F-040601 |     |     |
| --- | ----------------------------------------------- | --- | --- | --- | ---- | ---------------- | --- | --- |
|     | OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR |     |     |     | MAS  |                  |     |     |
|     |                                                 |     |     |     |      |                  |     |     |
Versión: 2, 20-05-

|     | MODALIDAD DESARROLLO  |     |     |     |     |     | 16  |     |
| --- | --------------------- | --- | --- | --- | --- | --- | --- | --- |

|     |     | TECNOLÓGICO  |     |     |     | Página:  15 de 21 |     |     |
| --- | --- | ------------ | --- | --- | --- | ----------------- | --- | --- |

| Almacenamiento AWS S3  |     | Almacenamiento de archivos multimedia de eventos  |     |     |     |     |     |     |
| ---------------------- | --- | ------------------------------------------------- | --- | --- | --- | --- | --- | --- |
Standard  estimado en 50 GB mensuales a $0,023 por GB  $4.830 COP
| Meta Business API  |     | Costo por mensajes enviados en producción  |     |     |     |     |     |     |
| ------------------ | --- | ------------------------------------------ | --- | --- | --- | --- | --- | --- |
WhatsApp  estimado según volumen de eventos activos  $42.000 COP
Renovación anual del dominio nexvio.co y
Dominio y certificado SSL  certificado SSL dividido en cuota mensual  $14.700 COP
| Mantenimiento y soporte  |     | 10 horas mensuales de soporte, corrección de  |     |     |     |     |     |     |
| ------------------------ | --- | --------------------------------------------- | --- | --- | --- | --- | --- | --- |
técnico  errores y actualizaciones de seguridad  $400.000 COP
Monitoreo de disponibilidad, métricas de
Monitoreo AWS CloudWatch rendimiento y alertas en tiempo real  $29.400 COP
| TOTAL MENSUAL  |     |     |     |     |     |     | $727.348 COP    |     |
| -------------- | --- | --- | --- | --- | --- | --- | --------------- | --- |
| TOTAL ANUAL    |     |     |     |     |     |     | $8.728.176 COP  |     |

En conclusión, el proyecto Nexvio es económicamente viable en su fase de desarrollo. El único costo
real corresponde al talento humano, dado que la totalidad del stack  tecnológico opera sobre
herramientas de código abierto y planes gratuitos de servicios cloud. Esto representa una ventaja
significativa frente a proyectos similares que requieren licenciamiento comercial, reduciendo la
barrera de entrada y respaldando la viabilidad del producto como futuro emprendimiento tecnológico.

6.3. PLAN DE COMUNICACIONES

En la Tabla 6 se evidencia el plan de comunicaciones especificado según el participante por canal
frecuencia y tipo de comunicación.

Tabla 6. Plan de comunicaciones
|     | Tipo de comunicación  |     | Canal  |     | Frecuencia  |     | Participantes  |     |
| --- | --------------------- | --- | ------ | --- | ----------- | --- | -------------- | --- |
Seguimiento del avance  Reunión presencial o  Equipo de desarrollo y
Cada dos semanas
|     | del proyecto   |     | videollamada  |                    |     |     | director del proyecto   |     |
| --- | -------------- | --- | ------------- | ------------------ | --- | --- | ----------------------- | --- |
|     | Validación de  |     |               | Al cierre de cada  |     |     | Equipo de desarrollo y  |     |
Reunión presencial
| entregables académicos  |     |     |     |     | fase  |     | director del proyecto  |     |
| ----------------------- | --- | --- | --- | --- | ----- | --- | ---------------------- | --- |
Validación de
Equipo de desarrollo y
|     | requerimientos y  | Reunión presencial o  |     | Al inicio y cierre de  |     |     |     |     |
| --- | ----------------- | --------------------- | --- | ---------------------- | --- | --- | --- | --- |
representante de Grupo
|     | aprobación de  |     | videollamada  |     | cada fase  |     |     |     |
| --- | -------------- | --- | ------------- | --- | ---------- | --- | --- | --- |
Studio Sebia
entregables
|     | Comunicación operativa  | WhatsApp y tablero  |         |     |         |     |                       |     |
| --- | ----------------------- | ------------------- | ------- | --- | ------- | --- | --------------------- | --- |
|     |                         |                     |         |     | Diaria  |     | Equipo de desarrollo  |     |
|     | diaria entre el equipo  |                     | Kanban  |     |         |     |                       |     |
Equipo de desarrollo, director
|     | Reporte de avance y  |                          |     | Por cada reunión  |            |     |                               |     |
| --- | -------------------- | ------------------------ | --- | ----------------- | ---------- | --- | ----------------------------- | --- |
|     |                      | Acta de reunión escrita  |     |                   |            |     | del proyecto y representante  |     |
|     | acuerdos formales    |                          |     |                   | realizada  |     |                               |     |
de Grupo Studio Sebia
Entrega de documentos  Correo electrónico o  Según cronograma  Equipo de desarrollo y
para revisión  OneDrive  de entregables  director del proyecto
Equipo de desarrollo, director
Notificación de cambios
|     |     | Correo electrónico  |     | Cuando aplique  |     |     | del proyecto y representante  |     |
| --- | --- | ------------------- | --- | --------------- | --- | --- | ----------------------------- | --- |
en el alcance
de Grupo Studio Sebia

|     |                                                 |     |     | Código: F-040601 |     |
| --- | ----------------------------------------------- | --- | --- | ---------------- | --- |
|     | OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR |     |     | MAS              |     |
|     |                                                 |     |     |                  |     |
Versión: 2, 20-05-

|     | MODALIDAD DESARROLLO  |     |     |     | 16  |
| --- | --------------------- | --- | --- | --- | --- |

|     |     | TECNOLÓGICO  |     | Página:  16 de 21 |     |
| --- | --- | ------------ | --- | ----------------- | --- |

Los anexos de la organización beneficiaria y las actas de las reuniones mantenidas con el director
de la empresa se encuentran en el One Drive adjuntado del proyecto.

6.7. RIESGOS

Tabla 7. Matriz de identificación y gestión de riesgos del proyecto Nexvio.
Tipo  Riesgo  Probabilidad  Impacto  Severidad  Plan de Respuesta
1: Riesgos Técnicos
Construir una prueba
Complejidad de la
técnica en el primer
separación de
sprint antes de
datos entre
| Técnico  |     | Media  | Alto  | Alto  | desarrollar las demás  |
| -------- | --- | ------ | ----- | ----- | ---------------------- |
organizaciones
funcionalidades y
mayor a la
validar los resultados
estimada
con el director.
|          | Conflictos de       |        |        |           | Documentar contratos     |
| -------- | ------------------- | ------ | ------ | --------- | ------------------------ |
|          | integración entre   |        |        |           | de comunicación antes    |
| Técnico  |                     | Media  | Medio  | Moderado  |                          |
|          | aplicación móvil y  |        |        |           | de programar y ejecutar  |
|          | backend             |        |        |           | pruebas continuas.       |
Fallas en
Pruebas de carga
comunicación en
desde el Sprint 5 y
| Técnico  | tiempo real con  | Baja  | Alto  | Alto  |     |
| -------- | ---------------- | ----- | ----- | ----- | --- |
sistema de reconexión
Socket.io bajo
automática.
carga
2: Riesgos de Integraciones Externas
Validación de requerimientos y aprobación de entregables
Cambios o
Construir la integración
restricciones en la
como componente
Meta Business
| Integración  |     | Baja  | Alto  | Alto  | independiente y  |
| ------------ | --- | ----- | ----- | ----- | ---------------- |
API (WhatsApp,
monitorear cambios
Instagram,
oficiales de Meta.
Facebook)
|              | Límites de uso o   |        |        |           | Usar cuentas de prueba    |
| ------------ | ------------------ | ------ | ------ | --------- | ------------------------- |
|              | bloqueo de cuenta  |        |        |           | y mantener separados      |
| Integración  |                    | Media  | Medio  | Moderado  |                           |
|              | en Meta Business   |        |        |           | los entornos de           |
|              | API por pruebas    |        |        |           | desarrollo y producción.  |
3: Riesgos de Recursos Humanos
Entrega de documentos para revisión
Falta de tiempo
|     | por carga  |     |     |     | Reservar una semana  |
| --- | ---------- | --- | --- | --- | -------------------- |
Recursos
|     | académica  | Alta  | Medio  | Alto  | de margen por sprint y  |
| --- | ---------- | ----- | ------ | ----- | ----------------------- |
Humanos
|     | paralela de los  |     |     |     | priorizar tareas críticas.  |
| --- | ---------------- | --- | --- | --- | --------------------------- |
desarrolladores
| Recursos  | Desalineación      |        |        |           | Reuniones semanales  |
| --------- | ------------------ | ------ | ------ | --------- | -------------------- |
|           |                    | Media  | Medio  | Moderado  |                      |
| Humanos   | técnica entre los  |        |        |           | de sincronización y  |

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 17 de 21
dos integrantes revisión cruzada de
del equipo código.
4: Riesgos de Despliegue y Operación
Fallas en el
ambiente de Despliegue progresivo
Despliegue producción Baja Alto Alto desde Sprint 8 con plan
durante la demo de reversión definido.
final
Perdida o
Copias de seguridad
corrupción de
Despliegue Baja Alto Alto automáticas diarias y
datos en
alertas de monitoreo.
producción
Escalado automático de
Caída del servicio
infraestructura y
Operación durante un Baja Alto Alto
recuperación en menos
congreso en curso
de 15 minutos.
6.8. ACERCA DEL PRODUCTO
Modelo de Desarrollo y Metodología
El proyecto se desarrolla bajo Scrum como marco de trabajo ágil, organizado en ocho sprints con
duraciones variables entre una y cinco semanas según la complejidad de cada fase. Scrum permite
planificar el trabajo en ciclos cortos con entregables concretos y demostrables al final de cada sprint,
lo que facilita la validación progresiva con el director y con Grupo Studio Sebia. Dentro de cada sprint
el equipo utiliza un tablero Kanban para hacer seguimiento diario del estado de las tareas,
clasificándolas entre pendiente, en progreso y completado. Cada sprint incluye cuatro ceremonias:
planificación al inicio, desarrollo durante el ciclo, revisión interna al finalizar y retrospectiva para
identificar mejoras para el siguiente sprint.
Control de versiones y ambientes
El código fuente se gestiona en GitHub con ramas protegidas y revisión cruzada obligatoria antes de
incorporar cualquier cambio. El proyecto opera en tres ambientes diferenciados: desarrollo para el
trabajo diario del equipo, pruebas como réplica del ambiente final para validaciones, y producción
para el despliegue definitivo de la plataforma.
Tecnologías utilizadas
La Tabla 6 presenta las tecnologías seleccionadas para el desarrollo de Nexvio, organizadas por
capa del sistema.
Tabla 8. Tecnologías utilizadas en el desarrollo de Nexvio.
Capa Tecnología Uso en el proyecto
Desarrollo de la app para iOS y
Aplicación móvil React Native Android desde una única base de
código

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 18 de 21
Desarrollo del panel
Panel web Next.js con React y TailwindCSS administrativo con renderizado
optimizado
Estructura del servidor con
Backend NestJS con TypeScript soporte para comunicación en
tiempo real
Gestión y migración de la base de
ORM Prisma
datos
Almacenamiento de datos con
Base de datos PostgreSQL separación completa entre
organizaciones
Gestión de sesiones y datos de
Caché Redis
alta frecuencia de acceso
Preguntas y encuestas en vivo
Comunicación en tiempo real Socket.io
durante los eventos
Autenticación segura de usuarios
Autenticación AWS Cognito
con tokens de acceso
Almacenamiento de imágenes y
Almacenamiento de archivos AWS S3 archivos multimedia de cada
congreso
Integración con WhatsApp,
Mensajería omnicanal Meta Business API
Instagram y Facebook
Prototipado de la aplicación móvil
Diseño UI/UX Figma
y panel web
Control de versiones y
Repositorio de código GitHub
colaboración del equipo
Despliegue del servidor y base de
Infraestructura de desarrollo Railway y Supabase
datos en fase de desarrollo
Estándares de desarrollo
Para garantizar la calidad y consistencia del código a lo largo del proyecto el equipo aplica
convenciones de nomenclatura definidas, mensajes de cambio descriptivos siguiendo el formato de
Conventional Commits, revisión obligatoria de todo cambio por al menos un integrante del equipo
antes de ser incorporado al proyecto, y documentación de todos los endpoints del servidor bajo el
estándar OpenAPI3.0.
Pruebas y validación
La estrategia de pruebas del proyecto cubre cinco niveles. Las pruebas unitarias validan la lógica de
cada módulo de forma aislada con una cobertura del 70% por módulo. Las pruebas de integración
verifican que todos los módulos del sistema se comunican correctamente entre sí. Las pruebas de
extremo a extremo validan los flujos completos del usuario tanto en la aplicación móvil como en el
panel web. Las pruebas de carga evalúan el comportamiento del sistema con al menos 120 usuarios
simultáneos. Finalmente, las pruebas de seguridad verifican el aislamiento entre organizaciones, la
autentivas de usuarios y el cifrado de datos conforme a la Ley 1581 de 2012.
Lenguajes de Programación
• TypeScript: Lenguaje principal tanto en frontend como en backend, garantizando tipado
estático y mantenibilidad.
• JavaScript: Se usa en configuraciones y scripts de automatización.
• SQL: Establecido para consultas y migraciones en PostgreSQL.

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 19 de 21
Bases de Datos
El proyecto utiliza dos sistemas de almacenamiento de datos. PostgreSQL es la base de datos
principal del sistema y está configurada para mantener los datos de cada organización
completamente separados entre sí, garantizando que la información de un congreso nunca sea
accesible desde otro. Redis gestiona el almacenamiento temporal de sesiones activas y los datos
que se consultan con alta frecuencia durante los eventos, lo que mejora el rendimiento general del
sistema.
Arquitectura de software
Nexvio sigue una arquitectura de cuatro capas: los clientes, que son la aplicación móvil y el panel
web, se comunican con un servidor central que organiza la lógica del negocio en módulos
independientes, los cuales a su vez se conectan con la capa de datos donde se almacena toda la
información. Esta separación por capas permite que cada parte del sistema pueda modificarse o
escalar sin afectar a las demás, y garantiza que los datos de cada organización permanezcan
completamente aislados entre sí.
7. PROPIEDAD INTELECTUAL
DECLARACIÓN DE DERECHOS DE PROPIEDAD INTELECTUAL
Los suscritos, Sebastián Durán Forero, identificado(a) con C.C. No. 1031643524, y María José
Galindo Piñeros, identificada con C.C. No. 1032798358, autores del proyecto de grado titulado
"Nexvio: Plataforma de Gestión Centralizada de Congresos y Eventos para Organizaciones",
presentado ante la Universidad El Bosque como requisito para optar al título de ingeniero de
sistemas, declaramos:
Sobre los Derechos Morales: Que somos los únicos autores y creadores de la totalidad del
contenido intelectual del presente trabajo, incluyendo el diseño de arquitectura de software, el código
fuente, los diseños de interfaz y la documentación técnica asociada. En consecuencia, nos asiste el
derecho a ser reconocidos como autores de esta obra de manera permanente e irrenunciable, de
conformidad con lo establecido en la Política de Propiedad Intelectual de la Universidad El Bosque
(Sección 6.1) y la legislación colombiana aplicable.
Sobre los Derechos Patrimoniales: Que el presente proyecto fue desarrollado con recursos
propios, sin hacer uso sustancial de recursos financieros, de infraestructura o equipos especializados
de la Universidad El Bosque, y sin financiación de terceros. En consecuencia, de conformidad con
lo establecido en la Sección 7.4 de la Política de Propiedad Intelectual de la Universidad El Bosque,
los derechos patrimoniales sobre el software, diseños y demás producción intelectual derivada del
proyecto corresponden exclusivamente a los autores.
Sobre la licencia a la Universidad: En cumplimiento del Parágrafo Primero del Artículo 7.4 de la
citada Política, los autores otorgamos a la Universidad El Bosque una licencia de uso no exclusiva,
gratuita y sin límite de tiempo, únicamente para la consulta del presente documento académico en
el repositorio institucional.
Firmamos a los 23 días del mes de abril de 2026.
Sebastián Durán Forero - Autor C.C. No. 1031623524

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 20 de 21
María José Galindo Piñeros - Autora C.C. No. 1032798358
8. REFERENCIAS
[1] V. Velepucha and P. Flores, "A Survey on Microservices Architecture: Principles, Patterns and Migration Challenges,"
IEEE Access, vol. 11, pp. 88339–88358, 2023. doi: 10.1109/ACCESS.2023.3305687 PDF:
https://www.researchgate.net/publication/373151876
[2] A. Soldani, D. A. Tamburri, and W. J. Van Den Heuvel, "Challenges and Solution Directions of Microservice Architectures:
A Systematic Literature Review," Applied Sciences, vol. 12, no. 11, p. 5507, 2022. doi: 10.3390/app12115507
PDF: https://www.mdpi.com/2076-3417/12/11/5507
[3] V. Dolzhenko, "Development of Microservices Using NestJS: Architecture and Practical Examples," Universum:
Технические науки, no. 6(123), 2024. [Online]. Available: https://www.researchgate.net/publication/382629671
[4] S. Ghosh et al., "The Role of AI Enabled Chatbots in Omnichannel Customer Service," Journal of Engineering Research
and Reports, vol. 26, no. 6, pp. 327–345, 2024. [Online]. Available: https://www.researchgate.net/publication/381096092
[5] P. Thulasiram, "Integrating AI Chatbots with Omnichannel Customer Experience Strategies," International Journal of
Innovative Research in Computer and Communication Engineering, vol. 12, no. 9, pp. 11281–11288, 2024. [Online].
Available: https://www.researchgate.net/publication/391700744
[6] S. Pushpan, "Multi-Tenant Architecture: A Comprehensive Framework for Building Scalable SaaS Applications," Int. J.
Sci. Res. Comput. Sci. Eng. Inf. Technol., vol. 10, no. 6, pp. 1117–1126, Nov.–Dec. 2024. doi: 10.32628/CSEIT241061151
PDF: https://ijsrcseit.com/index.php/home/article/view/CSEIT241061151
[7] T. Golding, Building Multi-Tenant SaaS Architectures: Principles, Practices, and Patterns Using AWS, 1st ed. Sebastopol,
CA: O'Reilly Media, 2024. ISBN: 978-1-098-14064-9
Disponible en:
https://assets.ctfassets.net/00voh0j35590/E8HAy4KpoTHV2wQlnSWBu/8a597a97fea4c540ae2c64687f3c79cf/crl-oreilly-
multi-tenant-saas_Book.pdf
[8] Meta, React Native — Introduction, Meta Open Source, 2024. [Online]. Available: https://reactnative.dev/docs/getting-
started
[9] Trilon, NestJS — A Progressive Node.js Framework, NestJS Documentation, 2024. [Online]. Available:
https://docs.nestjs.com
[10] Socket.io, Socket.io Documentation v4, Socket.io, 2024. [Online]. Available: https://socket.io/docs/v4
[11] PostgreSQL Global Development Group, PostgreSQL 16 Documentation — Schemas, 2024. [Online]. Available:
https://www.postgresql.org/docs/current/ddl-schemas.html
[12] Amazon Web Services, Amazon Cognito Developer Guide, AWS Documentation, 2024. [Online]. Available:
https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html
[13] Amazon Web Services, Amazon S3 User Guide, AWS Documentation, 2024. [Online]. Available:
https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
[14] Meta for Developers, WhatsApp Cloud API Documentation, Meta Business Platform, 2024. [Online]. Available:
https://developers.facebook.com/docs/whatsapp/cloud-api
[15] J. Montaña, "El modelo biopsicosocial y cultural para la ingeniería," Universidad El Bosque, Bogotá, Colombia,
Documento de trabajo no publicado, 12 p., 2014. [Online]. Available:
https://drive.google.com/open?id=0B4Yenv8WNk5QNXJ0Q3NnRjZ6dU9Cb2ZFeVdFaVMwU0Z1QWxV

OPCIONES DE GRADO INGENIERÍA DE SISTPRELIMIENAR MAS Código: F-040601
Versión: 2, 20-05-
MODALIDAD DESARROLLO 16
TECNOLÓGICO
Página: 21 de 21
[16] H. Cárdenas López, El enfoque biopsicosocial y cultural en la formación de los profesionales de la salud en la
Universidad El Bosque. Bogotá: Universidad El Bosque, 2016. ISBN: 9789587390780
[17] Whova, "Whova: Award-winning Event Apps & Event Management," Whova Inc., 2024. [Online]. Available:
https://whova.com
[18] Eventtia, "Event Management Software for all your Events," Eventtia SAS, 2024. [Online]. Available:
https://www.eventtia.com/en/home
[19] Capterra, "Whova Software Reviews, Demo & Pricing," Gartner Digital Markets, 2024. [Online]. Available:
https://www.capterra.com/p/149712/Whova
[20] Eventee, "6 Cheaper + Easier to Use Whova Alternatives for Events," Eventee s.r.o., 2024. [Online]. Available:
https://eventee.com/blog/whova-alternatives-for-events
[21] Vercel, Next.js Documentation, Vercel Inc., 2024. [Online]. Available: https://nextjs.org/docs
[22] Redis Ltd., Redis Documentation, Redis Ltd., 2024. [Online]. Available: https://redis.io/docs
María José Galindo Piñeros Sebastián Durán Forero Luis Alejandro López
Ballen