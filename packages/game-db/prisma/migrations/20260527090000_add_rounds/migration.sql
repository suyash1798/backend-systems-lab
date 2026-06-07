CREATE TABLE IF NOT EXISTS "game_rounds" (
  "id" BIGSERIAL PRIMARY KEY,
  "round_id" TEXT NOT NULL UNIQUE,
  "user_id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMPTZ
);

ALTER TABLE "game_spins"
  ADD COLUMN IF NOT EXISTS "round_id" TEXT;

UPDATE "game_spins"
SET "round_id" = 'legacy-round-' || "id"::text
WHERE "round_id" IS NULL;

INSERT INTO "game_rounds" ("round_id", "user_id", "room_id", "status", "created_at", "completed_at")
SELECT "round_id", "user_id", "room_id", 'DONE', "created_at", "created_at"
FROM "game_spins"
ON CONFLICT ("round_id") DO NOTHING;

ALTER TABLE "game_spins"
  ALTER COLUMN "round_id" SET NOT NULL;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_spins_round_id_fkey'
  ) THEN
    ALTER TABLE "game_spins"
      ADD CONSTRAINT "game_spins_round_id_fkey"
      FOREIGN KEY ("round_id") REFERENCES "game_rounds"("round_id");
  END IF;
END $$;
