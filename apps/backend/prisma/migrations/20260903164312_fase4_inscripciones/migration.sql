-- CreateTable
CREATE TABLE "inscripcion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "congreso_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'confirmada',
    "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inscripcion_organizacion_id_idx" ON "inscripcion"("organizacion_id");

-- CreateIndex
CREATE INDEX "inscripcion_congreso_id_idx" ON "inscripcion"("congreso_id");

-- CreateIndex
CREATE INDEX "inscripcion_usuario_id_idx" ON "inscripcion"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscripcion_congreso_id_usuario_id_key" ON "inscripcion"("congreso_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_congreso_id_fkey" FOREIGN KEY ("congreso_id") REFERENCES "congreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
