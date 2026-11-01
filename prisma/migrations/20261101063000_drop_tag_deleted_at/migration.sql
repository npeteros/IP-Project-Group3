-- Tags are hard-deleted now (their entry_tag links cascade), so the soft-delete column goes.
-- Any tag that was already soft-deleted is removed for real, so re-using its name creates a new tag.
DELETE FROM "tag" WHERE "deletedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "tag" DROP COLUMN "deletedAt";
