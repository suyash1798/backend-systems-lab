import psycopg
from psycopg.rows import dict_row

from lobby.config import DATABASE_URL


def connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def migrate():
    with connection() as conn:
        conn.execute(
            """
            create table if not exists game_rooms (
              room_id text primary key,
              game_id text not null,
              status text not null,
              created_at timestamptz not null default now(),
              closed_at timestamptz
            )
            """
        )
        conn.execute(
            """
            create table if not exists game_room_players (
              room_id text not null references game_rooms(room_id),
              user_id text not null,
              joined_at timestamptz not null default now(),
              primary key (room_id, user_id)
            )
            """
        )
        conn.execute(
            """
            create table if not exists game_room_invites (
              invite_id text primary key,
              room_id text not null references game_rooms(room_id),
              game_id text not null,
              invited_by_user_id text not null,
              invited_user_id text not null,
              status text not null default 'PENDING',
              created_at timestamptz not null default now(),
              expires_at timestamptz not null
            )
            """
        )
        conn.commit()
