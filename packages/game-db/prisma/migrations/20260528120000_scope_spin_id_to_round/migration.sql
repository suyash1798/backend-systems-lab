DROP INDEX IF EXISTS "game_spins_user_id_spin_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "game_spins_user_id_round_id_spin_id_key"
  ON "game_spins" ("user_id", "round_id", "spin_id");
