-- ============================================================
-- 1. Rename ProfessionalProfiles -> VolunteerProfiles
-- ============================================================
ALTER TABLE "ProfessionalProfiles" RENAME TO "VolunteerProfiles";
ALTER TABLE "VolunteerProfiles" RENAME CONSTRAINT "ProfessionalProfiles_pkey" TO "VolunteerProfiles_pkey";
ALTER INDEX "ProfessionalProfiles_user_id_key" RENAME TO "VolunteerProfiles_user_id_key";
ALTER INDEX "ProfessionalProfiles_license_number_key" RENAME TO "VolunteerProfiles_id_document_number_key";
ALTER TABLE "VolunteerProfiles" RENAME CONSTRAINT "ProfessionalProfiles_user_id_fkey" TO "VolunteerProfiles_user_id_fkey";

ALTER TABLE "VolunteerProfiles" RENAME COLUMN "license_number" TO "id_document_number";
ALTER TABLE "VolunteerProfiles" RENAME COLUMN "profession_type" TO "declared_profession";
ALTER TABLE "VolunteerProfiles" RENAME COLUMN "is_verified" TO "is_active";
ALTER TABLE "VolunteerProfiles" ALTER COLUMN "is_active" SET DEFAULT true;

-- ============================================================
-- 2. Rename Reports -> VisitNotes, ajustar columnas
-- ============================================================
ALTER TABLE "Reports" RENAME TO "VisitNotes";
ALTER TABLE "VisitNotes" RENAME CONSTRAINT "Reports_pkey" TO "VisitNotes_pkey";
ALTER INDEX "Reports_visit_id_key" RENAME TO "VisitNotes_visit_id_key";
ALTER TABLE "VisitNotes" RENAME CONSTRAINT "Reports_visit_id_fkey" TO "VisitNotes_visit_id_fkey";

ALTER TABLE "VisitNotes" DROP COLUMN "methodology_version";
ALTER TABLE "VisitNotes" DROP COLUMN "habitability_status";
ALTER TABLE "VisitNotes" DROP COLUMN "signature_hash";
ALTER TABLE "VisitNotes" ADD COLUMN "general_comments" TEXT;

-- Ya no hay ninguna columna usando este tipo -> se puede borrar
DROP TYPE "HabitabilityStatus";

-- ============================================================
-- 3. Nuevo enum para el estado por zona
-- ============================================================
CREATE TYPE "ZoneStatus" AS ENUM ('SAFE', 'CAUTION', 'DANGEROUS');

-- ============================================================
-- 4. RequestState: quitar SECOND_VISIT_REQUIRED, renombrar
--    WAITING_PROFESSIONAL -> WAITING_VOLUNTEER,
--    REPORT_PENDING -> NOTE_PENDING
--    (con remapeo de datos existentes via CASE)
-- ============================================================
ALTER TABLE "PropertyRequests" ALTER COLUMN "state" DROP DEFAULT;
ALTER TYPE "RequestState" RENAME TO "RequestState_old";
CREATE TYPE "RequestState" AS ENUM (
  'REQUESTED',
  'WAITING_VOLUNTEER',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'VERIFICATION_PENDING',
  'NOTE_PENDING',
  'COMPLETED',
  'CANCELLED',
  'REASSIGNMENT_REQUIRED'
);
ALTER TABLE "PropertyRequests"
  ALTER COLUMN "state" TYPE "RequestState"
  USING (
    CASE "state"::text
      WHEN 'WAITING_PROFESSIONAL' THEN 'WAITING_VOLUNTEER'
      WHEN 'REPORT_PENDING' THEN 'NOTE_PENDING'
      WHEN 'SECOND_VISIT_REQUIRED' THEN 'WAITING_VOLUNTEER'
      ELSE "state"::text
    END
  )::"RequestState";
ALTER TABLE "PropertyRequests" ALTER COLUMN "state" SET DEFAULT 'REQUESTED';
DROP TYPE "RequestState_old";

-- ============================================================
-- 5. Role: PROFESSIONAL -> VOLUNTEER
-- ============================================================
ALTER TABLE "Users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'VOLUNTEER', 'ADMIN', 'COORD_LOCAL');
ALTER TABLE "Users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'PROFESSIONAL' THEN 'VOLUNTEER'
      ELSE "role"::text
    END
  )::"Role";
ALTER TABLE "Users" ALTER COLUMN "role" SET DEFAULT 'CITIZEN';
DROP TYPE "Role_old";

-- ============================================================
-- 6. Visits: professional_id -> volunteer_id
-- ============================================================
ALTER TABLE "Visits" RENAME COLUMN "professional_id" TO "volunteer_id";
ALTER TABLE "Visits" RENAME CONSTRAINT "Visits_professional_id_fkey" TO "Visits_volunteer_id_fkey";

-- ============================================================
-- 7. Nueva tabla VisitNoteZones
-- ============================================================
CREATE TABLE "VisitNoteZones" (
    "id" TEXT NOT NULL,
    "visit_note_id" TEXT NOT NULL,
    "zone_name" TEXT NOT NULL,
    "status" "ZoneStatus" NOT NULL,
    "comment" TEXT,

    CONSTRAINT "VisitNoteZones_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VisitNoteZones" ADD CONSTRAINT "VisitNoteZones_visit_note_id_fkey"
  FOREIGN KEY ("visit_note_id") REFERENCES "VisitNotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
