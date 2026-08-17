-- AlterTable
ALTER TABLE "Users"
  ADD COLUMN "data_consent_at" TIMESTAMP(3),
  ADD COLUMN "data_consent_version" TEXT;

-- AlterTable
ALTER TABLE "Visits" ADD COLUMN "released_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Messages" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_role" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotices" (
    "id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNotices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Messages_visit_id_created_at_idx" ON "Messages"("visit_id", "created_at");
CREATE INDEX "AdminNotices_volunteer_id_created_at_idx" ON "AdminNotices"("volunteer_id", "created_at");

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminNotices" ADD CONSTRAINT "AdminNotices_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "VolunteerProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
