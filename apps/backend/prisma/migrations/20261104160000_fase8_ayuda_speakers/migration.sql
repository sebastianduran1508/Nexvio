-- ==========================================================================
-- FASE 8 · Bloque 8.7.d — Artículo de Ayuda: speakers en el networking
-- (decisión de Sebastián: no complicar el flujo; explicarlo en la Ayuda).
-- ==========================================================================

INSERT INTO "articulo_ayuda" ("id", "titulo", "contenido", "orden", "actualizado_en") VALUES
(gen_random_uuid(), 'Speakers en el networking', $md$
En Nexvio hay **dos cosas distintas** que pueden ser la misma persona:

| | Qué es | Quién la crea |
|---|---|---|
| **Ficha del speaker** | Lo que sale en la **agenda**: foto, cargo y biografía junto a su charla. Con ella **no se entra** a la app. | Tú, en *Speakers*. |
| **Cuenta de asistente** | La persona que **inicia sesión** en la app con usuario y contraseña. | Tú, con el Excel o en *Usuarios*. |

Si un speaker **también vino como asistente** (está en el Excel y usa la app), puedes decirle a Nexvio que son la misma persona. Eso es **vincular**.

## Para qué sirve vincular

- En el **networking** su tarjeta aparece con la insignia **🎤 PONENTE** y sus charlas.
- Los asistentes pueden darle **💜 Me interesa** y, si hay match, **chatear** con él.

Si no lo vinculas, su ficha igual sale en la app (*Networking → Explorar → Ponentes*), pero solo con sus charlas: no se puede conectar con él.

## Cómo se hace

1. Ve a **Speakers** y abre la ficha del speaker.
2. En **Cuenta en la app**, busca su nombre entre los inscritos del congreso.
3. Pulsa **Guardar**. En la lista verás la etiqueta **🔗 En la app**.

Si el speaker **no aparece** en la lista, es porque no está inscrito: primero agrégalo en *Usuarios* (o en el Excel) y luego vuelve a vincularlo.

## ¿Y si la foto es distinta?

Manda **lo que la persona puso en su perfil** de la app. Si dejó algo vacío (por ejemplo, no subió foto), en el networking se usa lo de su ficha de speaker. En la **agenda** siempre se usa la ficha que tú controlas.
$md$, 6, CURRENT_TIMESTAMP);
