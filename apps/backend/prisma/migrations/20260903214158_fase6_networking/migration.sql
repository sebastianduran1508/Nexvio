-- CreateTable
CREATE TABLE "interes_networking" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "emisor_id" UUID NOT NULL,
    "receptor_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interes_networking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conexion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "interes_id" UUID NOT NULL,
    "limite_mensajes" INTEGER NOT NULL DEFAULT 20,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conexion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensaje_chat" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "conexion_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "enviado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensaje_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interes_networking_organizacion_id_idx" ON "interes_networking"("organizacion_id");

-- CreateIndex
CREATE INDEX "interes_networking_congreso_id_idx" ON "interes_networking"("congreso_id");

-- CreateIndex
CREATE UNIQUE INDEX "interes_networking_congreso_id_emisor_id_receptor_id_key" ON "interes_networking"("congreso_id", "emisor_id", "receptor_id");

-- CreateIndex
CREATE UNIQUE INDEX "conexion_interes_id_key" ON "conexion"("interes_id");

-- CreateIndex
CREATE INDEX "conexion_organizacion_id_idx" ON "conexion"("organizacion_id");

-- CreateIndex
CREATE INDEX "mensaje_chat_organizacion_id_idx" ON "mensaje_chat"("organizacion_id");

-- CreateIndex
CREATE INDEX "mensaje_chat_conexion_id_idx" ON "mensaje_chat"("conexion_id");

-- AddForeignKey
ALTER TABLE "interes_networking" ADD CONSTRAINT "interes_networking_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interes_networking" ADD CONSTRAINT "interes_networking_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interes_networking" ADD CONSTRAINT "interes_networking_emisor_id_fkey" FOREIGN KEY ("emisor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interes_networking" ADD CONSTRAINT "interes_networking_receptor_id_fkey" FOREIGN KEY ("receptor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conexion" ADD CONSTRAINT "conexion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conexion" ADD CONSTRAINT "conexion_interes_id_fkey" FOREIGN KEY ("interes_id") REFERENCES "interes_networking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_chat" ADD CONSTRAINT "mensaje_chat_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_chat" ADD CONSTRAINT "mensaje_chat_conexion_id_fkey" FOREIGN KEY ("conexion_id") REFERENCES "conexion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_chat" ADD CONSTRAINT "mensaje_chat_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
