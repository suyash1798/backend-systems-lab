create table if not exists round_actions (
  id bigserial primary key,
  round_id text not null references game_rounds(round_id),
  user_id text not null,
  room_id text not null,
  action text not null,
  request_id text not null,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  unique (round_id, action, request_id)
);

create index if not exists round_actions_round_id_created_at_idx
  on round_actions (round_id, created_at);
