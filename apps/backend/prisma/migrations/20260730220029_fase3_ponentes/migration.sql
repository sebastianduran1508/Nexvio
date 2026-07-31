-- CreateTable
CREATE TABLE "ponente" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "bio" TEXT,
    "foto_url" TEXT,

    CONSTRAINT "ponente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion_ponente" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "ponente_id" UUID NOT NULL,

    CONSTRAINT "sesion_ponente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ponente_organizacion_id_idx" ON "ponente"("organizacion_id");

-- CreateIndex
CREATE INDEX "ponente_congreso_id_idx" ON "ponente"("congreso_id");

-- CreateIndex
CREATE INDEX "sesion_ponente_organizacion_id_idx" ON "sesion_ponente"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_ponente_sesion_id_ponente_id_key" ON "sesion_ponente"("sesion_id", "ponente_id");

-- AddForeignKey
ALTER TABLE "ponente" ADD CONSTRAINT "ponente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponente" ADD CONSTRAINT "ponente_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_ponente" ADD CONSTRAINT "sesion_ponente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_ponente" ADD CONSTRAINT "sesion_ponente_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_ponente" ADD CONSTRAINT "sesion_ponente_ponente_id_fkey" FOREIGN KEY ("ponente_id") REFERENCES "ponente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
