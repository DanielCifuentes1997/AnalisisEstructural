-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "VolunteerProfiles"
  ADD COLUMN "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verified_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by" TEXT,
  ADD COLUMN "review_notes" TEXT;

-- CreateIndex: la bitacora se consulta por fecha y por actor.
CREATE INDEX "AuditLogs_timestamp_idx" ON "AuditLogs"("timestamp" DESC);
CREATE INDEX "AuditLogs_actor_id_idx" ON "AuditLogs"("actor_id");
ALTER TABLE "AuditLogs" ADD COLUMN "notes" TEXT;
