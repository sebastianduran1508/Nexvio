-- ==========================================================================
-- FASE 8 · Bloque 8.6.d — Ayuda del panel (artículos editables)
--
-- Se aplica con (backend DETENIDO):
--   npx prisma migrate dev
--   npx prisma generate        <- Prisma 7 ya no lo hace solo
--
-- ---------------------------------------------------------------------------
-- LA PRIMERA TABLA SIN organizacion_id (decisión consciente)
-- ---------------------------------------------------------------------------
-- La ayuda es de toda la plataforma: la leen todos los organizadores y solo
-- la escribe el superadmin. Por eso su RLS no filtra por organización:
--   - LEER:     cualquiera  (es una guía de uso, no un dato privado).
--   - ESCRIBIR: solo si app.rol = 'admin'.
--
-- app.rol lo fija el backend en cada transacción (runInTenant) con el rol del
-- token FIRMADO por Supabase, igual que app.org_id. El RolesGuard ya impide que
-- un organizador llegue a las rutas de escritura; esta política es el segundo
-- cerrojo: si algún día un error de código lo dejara pasar, la base igual
-- rechazaría la escritura.
-- ==========================================================================

CREATE TABLE "articulo_ayuda" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articulo_ayuda_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "articulo_ayuda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "articulo_ayuda" FORCE ROW LEVEL SECURITY;

-- Dos políticas "permisivas": Postgres deja pasar una fila si CUALQUIERA de
-- las dos lo permite. Para SELECT basta la primera; para escribir solo sirve
-- la segunda.
CREATE POLICY ayuda_lectura ON "articulo_ayuda"
  FOR SELECT
  USING (true);

CREATE POLICY ayuda_escritura_superadmin ON "articulo_ayuda"
  FOR ALL
  USING (current_setting('app.rol', true) = 'admin')
  WITH CHECK (current_setting('app.rol', true) = 'admin');

-- ---------------------------------------------------------------------------
-- Contenido inicial: para que la sección sirva desde el primer día. El
-- superadmin lo puede editar todo desde el panel.
-- ---------------------------------------------------------------------------
INSERT INTO "articulo_ayuda" ("id", "titulo", "contenido", "orden", "actualizado_en") VALUES
(gen_random_uuid(), 'Primeros pasos', $md$
Bienvenido al panel de **Nexvio**. Desde aquí se prepara todo lo que verán los asistentes en la app.

## El orden recomendado

1. **Crea el congreso** en *Congresos → Nuevo congreso*. Elige bien el país: de él sale la **zona horaria** en la que se escribe la agenda.
2. **Arma la agenda y los speakers** (menú *Agenda* y *Speakers*).
3. **Importa a los asistentes** desde el Excel de la organización (menú *Usuarios*).
4. **Personaliza la apariencia** del congreso: logo, portada y colores.
5. **Agrega los sponsors**.
6. Durante el evento, **envía avisos** a los asistentes y **modera** las preguntas de cada charla.

## Cómo moverte

- El **menú de la izquierda** lleva a cada sección. Si tu organización tiene varios congresos, primero te pregunta en cuál quieres trabajar.
- En el **detalle de cada congreso** tienes accesos directos a Agenda, Speakers, Sponsors, Apariencia y Asistentes.
$md$, 0, now()),

(gen_random_uuid(), 'Importar asistentes desde Excel', $md$
La organización recibe las inscripciones y los pagos; Nexvio solo necesita **la lista de inscritos**.

## Paso a paso

1. Entra a *Usuarios* → elige el congreso → **Plantilla** para descargar el Excel modelo.
2. Pásaselo a la organización. Columnas obligatorias: **nombres**, **tipo y número de documento**. El resto (cargo, empresa, país, teléfono, correo) es opcional.
3. **Importar Excel**: primero verás una **previsualización** con cada fila clasificada. Nada se guarda todavía.
4. Si todo se ve bien, **confirma**. Descarga el **archivo de credenciales**: trae el usuario (por ejemplo `JPGarcia`) y la contraseña temporal de cada persona.

## Bueno saber

- Puedes importar el mismo archivo varias veces: **no duplica a nadie** (se reconoce por el documento).
- **Las contraseñas temporales solo se ven una vez.** Nadie puede consultarlas después, ni el sistema. Si alguien la pierde, usa *Restablecer contraseña* en su ficha.
- *Listado de acceso* genera un único archivo con **todos** los inscritos, útil cerca del evento.
$md$, 1, now()),

(gen_random_uuid(), 'Armar la agenda y los speakers', $md$
## Primero los speakers

En *Speakers* crea a cada ponente con su cargo, empresa, país y foto. Así podrás asignarlos al crear las charlas.

## Luego la agenda

En *Agenda* elige el día y pulsa **Nueva sesión**:

- **Tipo:** charla, taller, plenaria o **break** (café, almuerzo). Los breaks no llevan ponentes ni preguntas.
- **Horas:** se escriben en la **hora del lugar del evento**, estés donde estés. Los asistentes las verán en la hora de su teléfono.
- **Ponentes:** marca quién dicta la charla.

## Trucos

- Si una charla se alarga, al cambiar su hora de fin el sistema te ofrece **correr las siguientes** del mismo día. No tienes que moverlas una por una.
- Si dos actividades se cruzan, verás un **aviso** (puede ser a propósito, por ejemplo charlas en salas distintas).
$md$, 2, now()),

(gen_random_uuid(), 'Sponsors y apariencia del congreso', $md$
## Sponsors

En *Sponsors* agrega a cada patrocinador con su **logo**, su **nivel** (Oro, Plata, Bronce o General) y su sitio web.

- En la app aparecen en la franja **«Con el apoyo de»** del congreso y en la pantalla **Patrocinadores**.
- Los de **Oro** van primero y con el logo más grande. Usa las flechas para cambiar el orden dentro de cada nivel.
- Un logo en **PNG con fondo transparente** se ve mejor.

## Apariencia

Desde el detalle del congreso → **Apariencia** eliges el logo, la portada y los colores del evento. A la derecha ves una **vista previa** del celular.

- Si el color principal es muy claro, el sistema te avisa que el texto blanco **no se va a leer**. Prueba un tono más oscuro o uno de la paleta.
- **Usar la de Nexvio** deja todo como venía.
$md$, 3, now()),

(gen_random_uuid(), 'Enviar avisos a los asistentes', $md$
En *Notificaciones* puedes escribirles a todos los inscritos del congreso.

## Enviar o programar

- **Enviar ahora:** sale de inmediato.
- **Programar:** eliges día y hora (del lugar del evento) y el sistema lo envía solo. Mientras no haya salido, lo puedes **cancelar** desde el historial.
- **Sobre una charla:** si el aviso es de una charla concreta (cambio de sala, empieza en 5 minutos…), elígela. Al tocar el aviso, la app la abre.

## Dónde lo ven los asistentes

- Como **notificación** en su teléfono, si la activaron.
- Siempre en la bandeja **Avisos** del congreso dentro de la app, aunque no hayan activado las notificaciones.

> Un aviso enviado **no se puede deshacer**: revisa el texto en la vista previa antes de enviarlo.
$md$, 4, now());
