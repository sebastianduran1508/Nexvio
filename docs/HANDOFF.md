# HANDOFF — Continuación de Nexvio en un nuevo equipo

> **Para retomar en el portátil:** abre un chat nuevo de Cowork, conecta la carpeta del proyecto y comparte este archivo. Con esto el asistente retoma exactamente donde quedamos.

## Qué es Nexvio (resumen)

Plataforma SaaS multi-tenant para gestión centralizada de congresos y eventos de Grupo Studio Sebia. Proyecto de grado (Universidad El Bosque) de Sebastián Durán Forero y María José Galindo Piñeros. Se compone de: app móvil (asistentes), panel web (staff) y backend/API.

Documentos de referencia en esta misma carpeta `docs/`:
- `NEXVIO_Vfinal.md` — la tesis aprobada.
- `diagramas.html` — diagramas C4, ERD y secuencia RLS (hechos por el autor).
- `PLAN_DE_RUTA_NEXVIO.md` — el plan de ruta completo (fases, decisiones, MVP vs mercado).

## Decisiones de arquitectura ya cerradas

- **Auth:** Supabase Auth (NO AWS Cognito).
- **Multi-tenancy:** RLS con esquema compartido y `organizacion_id` (NO separación por esquemas).
- **Base de datos:** PostgreSQL en Supabase + pgvector.
- **Caché/realtime:** Redis en Upstash.
- **IA/RAG:** OpenAI API + pgvector.
- **Mensajería MVP:** solo WhatsApp (Meta Cloud API); Instagram/Facebook para producto a mercado.
- **Infra:** servicios gestionados (nada de AWS EC2/RDS autogestionado).
- **Estructura:** monorepo con pnpm workspaces.

## Stack

TypeScript en todo. Backend: NestJS + Prisma. Web: Next.js 14 + React + TailwindCSS. Móvil: Expo (React Native). Realtime: Socket.io.

## Estructura del repositorio

```
nexvio/
├── apps/
│   ├── backend/   NestJS  ✅ creado y corriendo (Hello World en http://localhost:3000)
│   ├── web/       Next.js ⚠️ creado, pendiente terminar instalación y primer arranque
│   └── mobile/    Expo    ⛔ pendiente de crear
├── packages/
│   └── shared/    (aún vacío) tipos TS compartidos
├── docs/          documentos de tesis + este handoff
├── package.json
└── pnpm-workspace.yaml   (incluye onlyBuiltDependencies con los builds nativos autorizados)
```

## GitHub

- Repo: **https://github.com/sebastianduran1508/Nexvio**
- ⚠️ **Ojo con la cuenta:** hay una cuenta vieja `sduranfo` cuyas credenciales quedaron cacheadas y causaron un error 403. Usar SIEMPRE la cuenta **`sebastianduran1508`** (la dueña del repo). Si el push falla con "denied to sduranfo", borrar la credencial vieja en el Administrador de Credenciales de Windows (`git:https://github.com`) y volver a hacer login.

## Gotcha importante: pnpm 10/11 bloquea build scripts

pnpm bloquea por seguridad los scripts de compilación de dependencias nativas (`unrs-resolver`, `sharp`, `esbuild`, `@tailwindcss/oxide`, etc.) y **aborta la instalación** si no están autorizados. Ya están listados en `pnpm-workspace.yaml` bajo `onlyBuiltDependencies`. Si aparece un `ERR_PNPM_IGNORED_BUILDS` con una dependencia nueva, agregarla a esa lista o correr `pnpm approve-builds`.

## Estado actual (Fase 0 — Fundaciones) ✅ COMPLETA

- [x] Herramientas instaladas en el PC original: Node v24, pnpm 11, Git, VS Code.
- [x] Cuentas creadas: GitHub, Supabase, Upstash.
- [x] Monorepo inicializado y en GitHub.
- [x] Backend NestJS creado y corriendo (Hello World verificado) en localhost:3000.
- [x] Panel web Next.js verificado y corriendo en localhost:3001 (ver nota de puertos).
- [x] App móvil Expo (SDK 54) creada y corriendo en Expo Go.
- [x] Fase 0 cerrada y commiteada.

### Notas de Fase 0 (para no repetir dolores)
- **Puertos en local:** backend usa 3000 y web usa 3001 (`next dev -p 3001`) para no chocar. En la nube cada servicio tiene su propio host, así que esto es solo para desarrollo local.
- **Expo + pnpm:** Expo Go de la Play Store solo soporta hasta SDK 54, no SDK 57 → la app se creó con SDK 54. Además Metro no resuelve las dependencias symlinked de pnpm por defecto; se solucionó con `apps/mobile/metro.config.js` (watchFolders al monorepo, nodeModulesPaths y `unstable_enableSymlinks = true`). NO usar `disableHierarchicalLookup` con pnpm.
- **Pendiente menor (no urgente):** los archivos aparecen como "modificados" en git por diferencias de fin de línea (CRLF/LF) al mezclar Windows y otras herramientas. Conviene añadir un `.gitattributes` con `* text=auto eol=lf` y renormalizar en una sesión futura.

## Próximos pasos inmediatos

1. Terminar Fase 0: verificar que el web arranca (`pnpm dev` en `apps/web` → localhost:3000), y crear la app móvil con Expo.
2. Commit final de Fase 0.
3. Pasar a **Fase 1 — Base de datos y multi-tenancy con RLS** (el corazón de la tesis): modelar el ERD en Prisma, migrar a Supabase, configurar políticas RLS y probar aislamiento entre dos organizaciones.

## Modo de trabajo acordado

Nivel: intermedio. El asistente da el paso a paso y el autor lo ejecuta. Ir en grupos grandes de trabajo pero detenerse si surge un problema. Cada fase cierra con una prueba. Commits frecuentes (Conventional Commits). Explicaciones amigables con ejemplos.
