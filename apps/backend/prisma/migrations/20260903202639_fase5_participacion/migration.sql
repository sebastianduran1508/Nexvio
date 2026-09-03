-- CreateTable
CREATE TABLE "pregunta" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encuesta" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "pregunta" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_encuesta" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "encuesta_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "opcion_encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_encuesta" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "encuesta_id" UUID NOT NULL,
    "opcion_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuesta_encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pregunta_organizacion_id_idx" ON "pregunta"("organizacion_id");

-- CreateIndex
CREATE INDEX "pregunta_sesion_id_idx" ON "pregunta"("sesion_id");

-- CreateIndex
CREATE INDEX "encuesta_organizacion_id_idx" ON "encuesta"("organizacion_id");

-- CreateIndex
CREATE INDEX "encuesta_sesion_id_idx" ON "encuesta"("sesion_id");

-- CreateIndex
CREATE INDEX "opcion_encuesta_organizacion_id_idx" ON "opcion_encuesta"("organizacion_id");

-- CreateIndex
CREATE INDEX "opcion_encuesta_encuesta_id_idx" ON "opcion_encuesta"("encuesta_id");

-- CreateIndex
CREATE INDEX "respuesta_encuesta_organizacion_id_idx" ON "respuesta_encuesta"("organizacion_id");

-- CreateIndex
CREATE INDEX "respuesta_encuesta_opcion_id_idx" ON "respuesta_encuesta"("opcion_id");

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_encuesta_encuesta_id_usuario_id_key" ON "respuesta_encuesta"("encuesta_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuesta" ADD CONSTRAINT "encuesta_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuesta" ADD CONSTRAINT "encuesta_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_encuesta" ADD CONSTRAINT "opcion_encuesta_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_encuesta" ADD CONSTRAINT "opcion_encuesta_encuesta_id_fkey" FOREIGN KEY ("encuesta_id") REFERENCES "encuesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_encuesta" ADD CONSTRAINT "respuesta_encuesta_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_encuesta" ADD CONSTRAINT "respuesta_encuesta_encuesta_id_fkey" FOREIGN KEY ("encuesta_id") REFERENCES "encuesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_encuesta" ADD CONSTRAINT "respuesta_encuesta_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opcion_encuesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_encuesta" ADD CONSTRAINT "respuesta_encuesta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
