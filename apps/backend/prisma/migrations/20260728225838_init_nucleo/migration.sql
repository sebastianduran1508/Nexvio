-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'organizador', 'coordinador', 'participante');

-- CreateTable
CREATE TABLE "organizacion" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "congreso" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',

    CONSTRAINT "congreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "sala" TEXT,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_slug_key" ON "organizacion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_organizacion_id_idx" ON "usuario"("organizacion_id");

-- CreateIndex
CREATE INDEX "congreso_organizacion_id_idx" ON "congreso"("organizacion_id");

-- CreateIndex
CREATE INDEX "sesion_organizacion_id_idx" ON "sesion"("organizacion_id");

-- CreateIndex
CREATE INDEX "sesion_congreso_id_idx" ON "sesion"("congreso_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "congreso" ADD CONSTRAINT "congreso_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
