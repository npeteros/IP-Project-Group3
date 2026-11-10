-- CreateEnum
CREATE TYPE "Mood" AS ENUM (
    'CALM',
    'GRATEFUL',
    'HAPPY',
    'HOPEFUL',
    'NEUTRAL',
    'ANXIOUS',
    'STRESSED',
    'SAD',
    'FRUSTRATED'
);

-- CreateTable
CREATE TABLE "framework" (
    "id" UUID NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "prompts" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "framework_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "entry"
    ADD COLUMN "mood" "Mood",
    ADD COLUMN "summary" TEXT,
    ADD COLUMN "analyzedAt" TIMESTAMPTZ(3),
    ADD COLUMN "frameworkId" UUID;

-- CreateIndex
CREATE INDEX "framework_userId_idx" ON "framework"("userId");

-- AddForeignKey
ALTER TABLE "framework" ADD CONSTRAINT "framework_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry" ADD CONSTRAINT "entry_frameworkId_fkey"
    FOREIGN KEY ("frameworkId") REFERENCES "framework"("id") ON DELETE SET NULL ON UPDATE CASCADE;
