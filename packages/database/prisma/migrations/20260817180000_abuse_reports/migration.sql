-- CreateEnum
CREATE TYPE "AbuseReason" AS ENUM ('PIDIO_DINERO', 'PIDIO_DATOS_PERSONALES', 'TRATO_IRRESPETUOSO', 'NO_LLEGO', 'SOSPECHOSO', 'OTRO');

-- AlterTable
ALTER TABLE "Visits" ADD COLUMN "released_by_role" "Role";

-- CreateTable
CREATE TABLE "AbuseReports" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" "AbuseReason" NOT NULL,
    "details" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbuseReports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbuseReports_created_at_idx" ON "AbuseReports"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "AbuseReports" ADD CONSTRAINT "AbuseReports_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
