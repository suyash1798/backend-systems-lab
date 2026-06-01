ALTER TABLE "game_spins"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "failed_at" TIMESTAMP(3);

ALTER TABLE "game_spins"
ALTER COLUMN "win_amount" DROP NOT NULL,
ALTER COLUMN "symbols" DROP NOT NULL,
ALTER COLUMN "balance" DROP NOT NULL;

UPDATE "game_spins"
SET "status" = 'COMPLETED',
    "completed_at" = "created_at"
WHERE "completed_at" IS NULL
  AND "win_amount" IS NOT NULL
  AND "symbols" IS NOT NULL
  AND "balance" IS NOT NULL;
