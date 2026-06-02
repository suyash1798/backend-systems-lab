class InviteRepository:
    def create(self, conn, invite_id: str, room, invited_by_user_id: str, invited_user_id: str):
        return conn.execute(
            """
            insert into game_room_invites (
              invite_id,
              room_id,
              game_id,
              invited_by_user_id,
              invited_user_id,
              expires_at
            )
            values (%s, %s, %s, %s, %s, now() + interval '15 minutes')
            returning invite_id, room_id, game_id, invited_by_user_id, invited_user_id,
                      status, created_at, expires_at
            """,
            (
                invite_id,
                room["room_id"],
                room["game_id"],
                invited_by_user_id,
                invited_user_id,
            ),
        ).fetchone()

    def get(self, conn, invite_id: str):
        return conn.execute(
            """
            select invite_id, room_id, game_id, invited_by_user_id, invited_user_id,
                   status, created_at, expires_at
            from game_room_invites
            where invite_id = %s
            """,
            (invite_id,),
        ).fetchone()

    def lock(self, conn, invite_id: str):
        return conn.execute(
            """
            select invite_id, room_id, game_id, invited_by_user_id, invited_user_id,
                   status, created_at, expires_at
            from game_room_invites
            where invite_id = %s
            for update
            """,
            (invite_id,),
        ).fetchone()

    def mark_status(self, conn, invite_id: str, status: str):
        return conn.execute(
            """
            update game_room_invites
            set status = %s
            where invite_id = %s
            returning invite_id, room_id, game_id, invited_by_user_id, invited_user_id,
                      status, created_at, expires_at
            """,
            (status, invite_id),
        ).fetchone()
