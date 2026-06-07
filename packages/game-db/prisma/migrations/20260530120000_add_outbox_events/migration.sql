create table if not exists outbox_events (
  id text primary key,
  event_key text not null unique,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists outbox_events_status_created_at_idx
  on outbox_events (status, created_at);
