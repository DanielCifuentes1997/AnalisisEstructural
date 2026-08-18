-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'DATE_PROPOSAL');
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "Messages"
  ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "proposed_date" TIMESTAMP(3),
  ADD COLUMN "proposal_status" "ProposalStatus";

-- AlterTable
ALTER TABLE "Visits" ADD COLUMN "scheduled_at" TIMESTAMP(3);
