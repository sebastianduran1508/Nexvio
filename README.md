# Nexvio

Plataforma de gestión centralizada de congresos y eventos para Grupo Studio Sebia.

Proyecto de grado — Ingeniería de Sistemas, Universidad El Bosque.
Autores: Sebastián Durán Forero y María José Galindo Piñeros.

## Estructura (monorepo)

```
nexvio/
├── apps/
│   ├── backend/   API — NestJS + Prisma
│   ├── web/       Panel web — Next.js
│   └── mobile/    App del asistente — Expo (React Native)
└── packages/
    └── shared/    Tipos de TypeScript compartidos
```

## Requisitos

- Node.js 20+
- pnpm 11+

## Comandos

```bash
pnpm backend   # arranca el backend en modo desarrollo
pnpm web       # arranca el panel web
pnpm mobile    # arranca la app móvil
```
