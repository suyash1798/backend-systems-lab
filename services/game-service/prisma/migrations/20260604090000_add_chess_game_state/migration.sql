create table if not exists chess_games (
  chess_game_id text primary key,
  room_id text not null unique,
  current_fen text not null,
  status text not null default 'ACTIVE',
  turn text not null,
  move_number integer not null default 0,
  white_user_id text,
  black_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chess_moves (
  id bigserial primary key,
  chess_game_id text not null references chess_games(chess_game_id),
  move_number integer not null,
  user_id text not null,
  color text not null,
  from_square text not null,
  to_square text not null,
  promotion text,
  san text not null,
  lan text not null,
  fen_after text not null,
  created_at timestamptz not null default now(),
  unique (chess_game_id, move_number)
);
