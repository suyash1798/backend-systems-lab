CREATE TABLE IF NOT EXISTS "game_spins" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "spin_id" TEXT NOT NULL,
  "bet_amount" INTEGER NOT NULL,
  "win_amount" INTEGER NOT NULL,
  "symbols" JSONB NOT NULL,
  "balance" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "game_spins_user_id_spin_id_key"
  ON "game_spins" ("user_id", "spin_id");
