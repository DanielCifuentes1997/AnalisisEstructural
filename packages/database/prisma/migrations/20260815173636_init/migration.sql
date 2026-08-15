-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis" WITH VERSION "3.4";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'PROFESSIONAL', 'ADMIN', 'COORD_LOCAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RequestState" AS ENUM ('REQUESTED', 'WAITING_PROFESSIONAL', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'REPORT_PENDING', 'COMPLETED', 'CANCELLED', 'REASSIGNMENT_REQUIRED', 'SECOND_VISIT_REQUIRED');

-- CreateEnum
CREATE TYPE "HabitabilityStatus" AS ENUM ('GREEN', 'YELLOW', 'ORANGE', 'RED');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "profession_type" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyRequests" (
    "id" TEXT NOT NULL,
    "citizen_id" TEXT NOT NULL,
    "geom" geography(Point, 4326) NOT NULL,
    "structural_type" TEXT NOT NULL,
    "damages_json" JSONB NOT NULL,
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "state" "RequestState" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visits" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "checkin_location" geography(Point, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reports" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "methodology_version" TEXT NOT NULL,
    "habitability_status" "HabitabilityStatus" NOT NULL,
    "evidence_urls" JSONB NOT NULL,
    "signature_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "prior_state" TEXT,
    "new_state" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_phone_number_key" ON "Users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfiles_user_id_key" ON "ProfessionalProfiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfiles_license_number_key" ON "ProfessionalProfiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "Reports_visit_id_key" ON "Reports"("visit_id");

-- AddForeignKey
ALTER TABLE "ProfessionalProfiles" ADD CONSTRAINT "ProfessionalProfiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRequests" ADD CONSTRAINT "PropertyRequests_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visits" ADD CONSTRAINT "Visits_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PropertyRequests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visits" ADD CONSTRAINT "Visits_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "ProfessionalProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reports" ADD CONSTRAINT "Reports_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

