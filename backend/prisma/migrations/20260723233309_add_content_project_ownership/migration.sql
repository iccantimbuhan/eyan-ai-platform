/*
  Security Hardening (Phase 0 ahead of Sprint 4.1): adds per-user ownership to
  ContentProject, extending the pattern already established by SavedPrompt
  (see ADR-0006 and ADR-0007). The column cannot be added as NOT NULL directly
  because the table already has rows, so this migration adds it nullable,
  backfills existing rows, then enforces NOT NULL.

  Backfill data source: as of this migration, every existing ContentProject
  row (3) and every existing GeneratedContent row (7) in this database was
  created by a single account, confirmed via GeneratedContent.createdBy
  (100% attributed to one user id). Existing ownerless projects are assigned
  to that account. Falls back to the earliest-created user if that specific
  id isn't present in a given environment.
*/

-- AlterTable: add nullable first so existing rows can be backfilled before NOT NULL is enforced
ALTER TABLE "ContentProject" ADD COLUMN "userId" TEXT;

-- Backfill existing rows
UPDATE "ContentProject"
SET "userId" = COALESCE(
  (SELECT id FROM "User" WHERE id = 'cmruyw6h100005fkr7z4ypc3z'),
  (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
)
WHERE "userId" IS NULL;

-- AlterTable: now safe to enforce NOT NULL
ALTER TABLE "ContentProject" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ContentProject_userId_idx" ON "ContentProject"("userId");

-- AddForeignKey
ALTER TABLE "ContentProject" ADD CONSTRAINT "ContentProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
