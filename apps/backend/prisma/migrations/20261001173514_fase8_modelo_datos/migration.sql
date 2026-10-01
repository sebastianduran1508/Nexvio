/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizacion_id,numero_documento]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "congreso" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "lugar" TEXT,
ADD COLUMN     "zona_horaria" TEXT NOT NULL DEFAULT 'America/Bogota';

-- AlterTable
ALTER TABLE "inscripcion" ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "tipo_suscripcion" TEXT;

-- AlterTable
ALTER TABLE "ponente" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "empresa" TEXT,
ADD COLUMN     "orden" INTEGER,
ADD COLUMN     "pais" TEXT,
ADD COLUMN     "pais_codigo" TEXT;

-- AlterTable
ALTER TABLE "sesion" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "orden" INTEGER,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'charla';

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "acepto_datos_en" TIMESTAMP(3),
ADD COLUMN     "apellidos" TEXT,
ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "empresa" TEXT,
ADD COLUMN     "foto_url" TEXT,
ADD COLUMN     "numero_documento" TEXT,
ADD COLUMN     "pais" TEXT,
ADD COLUMN     "pais_codigo" TEXT,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "tipo_documento" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "sponsor" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "logo_url" TEXT,
    "sitio_web" TEXT,
    "nivel" TEXT NOT NULL DEFAULT 'general',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalizacion_congreso" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "logo_url" TEXT,
    "imagen_portada_url" TEXT,
    "color_primario" TEXT,
    "color_secundario" TEXT,
    "tema_default" TEXT NOT NULL DEFAULT 'sistema',
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personalizacion_congreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo_push" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "plataforma" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visto_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivo_push_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "destino" TEXT NOT NULL DEFAULT 'todos',
    "sesion_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "enviados" INTEGER NOT NULL DEFAULT 0,
    "fallidos" INTEGER NOT NULL DEFAULT 0,
    "creado_por_id" UUID,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_en" TIMESTAMP(3),

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsor_organizacion_id_idx" ON "sponsor"("organizacion_id");

-- CreateIndex
CREATE INDEX "sponsor_congreso_id_idx" ON "sponsor"("congreso_id");

-- CreateIndex
CREATE UNIQUE INDEX "personalizacion_congreso_congreso_id_key" ON "personalizacion_congreso"("congreso_id");

-- CreateIndex
CREATE INDEX "personalizacion_congreso_organizacion_id_idx" ON "personalizacion_congreso"("organizacion_id");

-- CreateIndex
CREATE INDEX "dispositivo_push_organizacion_id_idx" ON "dispositivo_push"("organizacion_id");

-- CreateIndex
CREATE INDEX "dispositivo_push_expo_push_token_idx" ON "dispositivo_push"("expo_push_token");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_push_usuario_id_expo_push_token_key" ON "dispositivo_push"("usuario_id", "expo_push_token");

-- CreateIndex
CREATE INDEX "notificacion_organizacion_id_idx" ON "notificacion"("organizacion_id");

-- CreateIndex
CREATE INDEX "notificacion_congreso_id_idx" ON "notificacion"("congreso_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_organizacion_id_numero_documento_key" ON "usuario"("organizacion_id", "numero_documento");

-- AddForeignKey
ALTER TABLE "sponsor" ADD CONSTRAINT "sponsor_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor" ADD CONSTRAINT "sponsor_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizacion_congreso" ADD CONSTRAINT "personalizacion_congreso_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizacion_congreso" ADD CONSTRAINT "personalizacion_congreso_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo_push" ADD CONSTRAINT "dispositivo_push_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo_push" ADD CONSTRAINT "dispositivo_push_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
