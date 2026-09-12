# Identidad visual de Nexvio — Fuente de verdad (Bloque 8.0)

> Este documento es la **única fuente de verdad** de la marca. Los colores, la
> tipografía y los "tokens" de aquí se implementan luego en cada app en su propio
> formato: en el **web** como variables CSS (shadcn/Tailwind v4) y en el **móvil**
> como colores de Tailwind + NativeWind. Si un valor cambia, se cambia **aquí primero**.

## 1. Concepto

Identidad **Opción A** (aprobada por el cliente en la reunión de sep-2026):
marca **violeta** + acento **coral**, con **modo claro y oscuro** construidos con
*tokens de tema*. El logo es el concepto **"red de nodos"** (ver bloque 8.0.d).

### ¿Qué es un "token de tema"?

Un token es un **nombre con significado** en vez de un color suelto. En vez de
escribir `#5A46F0` por toda la app, usamos el nombre `primary`. En claro `primary`
vale violeta y en oscuro puede valer un violeta ligeramente distinto — **el nombre
no cambia, solo su valor según el tema**. Así, cambiar toda la app de claro a
oscuro es solo cambiar el valor de cada token, no tocar cada pantalla.

## 2. Colores de marca

| Rol | Nombre | Claro | Oscuro | Texto encima |
|---|---|---|---|---|
| Marca principal | Violeta | `#5A46F0` | `#5A46F0` | Blanco `#FFFFFF` |
| Violeta hover | Violeta 600 | `#4A38D6` | `#7C6BFF` | Blanco |
| Acento / CTA | Coral | `#FF7A59` | `#FF7A59` | Casi negro `#2A1206` |
| Coral hover | Coral 600 | `#F0603C` | `#F0603C` | Casi negro |

**Nota de contraste (importante):** el texto sobre el coral va **oscuro**, no blanco.
Blanco sobre coral se lee mal (contraste ~2.3:1, reprueba accesibilidad); casi negro
sobre coral pasa de sobra. Sobre el violeta sí va blanco (contraste ~6.5:1).

## 3. Escala de neutros (grises fríos)

Grises con un matiz frío para que combinen con el violeta. Van de fondos claros a
textos oscuros.

| Token | Hex | Uso típico |
|---|---|---|
| neutral-50 | `#FAFAFA` | Fondo de página (claro) |
| neutral-100 | `#F4F4F5` | Superficies suaves, hover |
| neutral-200 | `#E4E4E7` | Bordes (claro) |
| neutral-300 | `#D4D4D8` | Bordes marcados |
| neutral-400 | `#A1A1AA` | Texto tenue (oscuro) |
| neutral-500 | `#71717A` | Texto secundario (claro) |
| neutral-700 | `#3F3F46` | — |
| neutral-800 | `#27272A` | — |
| neutral-900 | `#18181B` | Texto principal (claro) |
| neutral-950 | `#0B0A12` | Fondo de página (oscuro, casi negro violáceo) |

Superficies extra del modo oscuro (elevaciones): `#16151F` (tarjetas),
`#1E1D29` (secundario/muted), `#26252F` (bordes).

## 4. Tokens semánticos (los que usan las apps)

Estos son los nombres que se usan al construir pantallas. Siguen la convención de
**shadcn** para que el web los tome sin fricción; el móvil usará los mismos nombres.

| Token | Claro | Oscuro | Qué es |
|---|---|---|---|
| `background` | `#FAFAFA` | `#0B0A12` | Fondo de la página |
| `foreground` | `#18181B` | `#FAFAFA` | Texto principal |
| `card` | `#FFFFFF` | `#16151F` | Fondo de tarjetas/paneles |
| `card-foreground` | `#18181B` | `#FAFAFA` | Texto sobre tarjetas |
| `popover` | `#FFFFFF` | `#16151F` | Menús flotantes |
| `popover-foreground` | `#18181B` | `#FAFAFA` | Texto de menús |
| `primary` | `#5A46F0` | `#5A46F0` | **Marca** (botón principal, enlaces) |
| `primary-foreground` | `#FFFFFF` | `#FFFFFF` | Texto sobre `primary` |
| `secondary` | `#F4F4F5` | `#1E1D29` | Botón/superficie secundaria |
| `secondary-foreground` | `#18181B` | `#FAFAFA` | Texto sobre `secondary` |
| `muted` | `#F4F4F5` | `#1E1D29` | Fondos apagados |
| `muted-foreground` | `#71717A` | `#A1A1AA` | Texto tenue/ayudas |
| `accent` | `#F4F4F5` | `#1E1D29` | Hover sutil (neutral, de shadcn) |
| `accent-foreground` | `#18181B` | `#FAFAFA` | Texto sobre `accent` |
| `coral` | `#FF7A59` | `#FF7A59` | **Acento de marca / CTA destacado** |
| `coral-foreground` | `#2A1206` | `#2A1206` | Texto sobre `coral` |
| `destructive` | `#EF4444` | `#F87171` | Borrar / error |
| `destructive-foreground` | `#FFFFFF` | `#2A0A0A` | Texto sobre `destructive` |
| `border` | `#E4E4E7` | `#26252F` | Bordes |
| `input` | `#E4E4E7` | `#26252F` | Borde de campos |
| `ring` | `#5A46F0` | `#7C6BFF` | Anillo de foco (accesibilidad) |

> **`primary` vs `coral`:** `primary` (violeta) es la marca y el botón principal
> por defecto. `coral` es el acento: se reserva para **1 acción destacada** por
> pantalla (el CTA que más queremos que pulsen). Si todo es coral, nada resalta.

### Radio y tipografía

- **Radio de esquinas** (`--radius`): `0.625rem` (10px) — moderno y amable.
- **Tipografía display / titulares / wordmark del logo:** **Space Grotesk**.
- **Tipografía de cuerpo / interfaz:** el web mantiene **Geist** (ya cableada);
  el móvil usa la fuente del sistema. (Se puede unificar a Inter más adelante.)

## 5. Cómo se implementa en cada app (resumen)

- **Web (bloque 8.0.b):** estos tokens van a `apps/web/src/app/globals.css` como
  variables CSS bajo `:root` (claro) y `.dark` (oscuro), expuestas a Tailwind v4
  con `@theme inline`. shadcn genera sus componentes usando estos nombres.
- **Móvil (bloque 8.0.c):** los mismos valores van a `tailwind.config.js` de
  `apps/mobile` como colores de Tailwind; NativeWind aplica las clases. El modo
  oscuro se activa con `userInterfaceStyle: "automatic"` en `app.json`.

## 6. Regla de oro

Nunca escribir un color "a mano" (`#5A46F0`, `bg-[#FF7A59]`) dentro de una
pantalla. Siempre usar el **token** (`bg-primary`, `text-muted-foreground`,
`bg-coral`). Así el modo claro/oscuro y cualquier reajuste de marca funcionan solos.
