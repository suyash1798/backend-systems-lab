class PlayerRepository:
    def get_by_device(self, conn, device_id: str):
        return conn.execute(
            """
            select player_id, device_id
            from players
            where device_id = %s
            """,
            (device_id,),
        ).fetchone()

    def create(self, conn, player_id: str, device_id: str):
        return conn.execute(
            """
            insert into players (player_id, device_id)
            values (%s, %s)
            returning player_id, device_id
            """,
            (player_id, device_id),
        ).fetchone()

    def exists(self, conn, player_id: str):
        return conn.execute(
            """
            select 1
            from players
            where player_id = %s
            """,
            (player_id,),
        ).fetchone() is not None

    def mark_seen(self, conn, player_id: str):
        conn.execute(
            """
            update players
            set last_seen_at = now()
            where player_id = %s
            """,
            (player_id,),
        )
