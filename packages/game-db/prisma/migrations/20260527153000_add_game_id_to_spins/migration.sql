ALTER TABLE "game_spins"
  ADD COLUMN IF NOT EXISTS "game_id" TEXT;

UPDATE "game_spins"
SET "game_id" = 'legacy-game'
WHERE "game_id" IS NULL;

ALTER TABLE "game_spins"
  ALTER COLUMN "game_id" SET NOT NULL;
