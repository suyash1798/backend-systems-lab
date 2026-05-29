class RoomRepository:
    def create(self, conn, room_id: str, game_id: str):
        return conn.execute(
            """
            insert into game_rooms (room_id, game_id, status)
            values (%s, %s, 'OPEN')
            returning room_id, game_id, status, created_at
            """,
            (room_id, game_id),
        ).fetchone()

    def find_available(self, conn, game_id: str, max_players: int):
        return conn.execute(
            """
            select r.room_id, r.game_id, r.status, r.created_at, r.closed_at
            from game_rooms r
            where r.room_id = (
              select candidate.room_id
              from game_rooms candidate
              left join game_room_players p on p.room_id = candidate.room_id
              where candidate.game_id = %s and candidate.status = 'OPEN'
              group by candidate.room_id, candidate.created_at
              having count(p.user_id) < %s
              order by candidate.created_at
              limit 1
            )
            order by r.created_at
            limit 1
            for update of r skip locked
            """,
            (game_id, max_players),
        ).fetchone()

    def get(self, conn, room_id: str):
        return conn.execute(
            """
            select room_id, game_id, status, created_at, closed_at
            from game_rooms
            where room_id = %s
            """,
            (room_id,),
        ).fetchone()

    def add_player(self, conn, room_id: str, user_id: str):
        conn.execute(
            """
            insert into game_room_players (room_id, user_id)
            values (%s, %s)
            on conflict do nothing
            """,
            (room_id, user_id),
        )

    def remove_player_from_other_rooms(self, conn, user_id: str, room_id: str):
        removed_rooms = conn.execute(
            """
            delete from game_room_players
            where user_id = %s and room_id <> %s
            returning room_id
            """,
            (user_id, room_id),
        ).fetchall()

        for removed_room in removed_rooms:
            conn.execute(
                """
                update game_rooms
                set status = 'OPEN', closed_at = null
                where room_id = %s and status = 'FULL'
                """,
                (removed_room["room_id"],),
            )

    def close_if_full(self, conn, room_id: str, max_players: int):
        count = conn.execute(
            """
            select count(*) as player_count
            from game_room_players
            where room_id = %s
            """,
            (room_id,),
        ).fetchone()["player_count"]

        if count >= max_players:
            conn.execute(
                """
                update game_rooms
                set status = 'FULL'
                where room_id = %s
                """,
                (room_id,),
            )

    def list_players(self, conn, room_id: str):
        return conn.execute(
            """
            select user_id, joined_at
            from game_room_players
            where room_id = %s
            order by joined_at
            """,
            (room_id,),
        ).fetchall()
