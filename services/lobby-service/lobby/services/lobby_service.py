from uuid import uuid4

from fastapi import HTTPException

from lobby.database import connection
from lobby.repositories import InviteRepository, RoomRepository

MAX_ROOM_PLAYERS = 5


class LobbyService:
    def __init__(self):
        self.rooms = RoomRepository()
        self.invites = InviteRepository()

    def load_game(self, game_id: str, player_id: str):
        with connection() as conn:
            with conn.transaction():
                room = self.rooms.find_available(conn, game_id, MAX_ROOM_PLAYERS)

                if not room:
                    room = self.rooms.create(conn, self._new_room_id(), game_id)

                self.rooms.remove_player_from_other_rooms(conn, player_id, room["room_id"])
                self.rooms.add_player(conn, room["room_id"], player_id)
                self.rooms.close_if_full(conn, room["room_id"], MAX_ROOM_PLAYERS)
                return self._room_response(conn, room["room_id"])

    def get_room(self, room_id: str):
        with connection() as conn:
            room = self.rooms.get(conn, room_id)

            if not room:
                raise HTTPException(status_code=404, detail={"error": "room not found"})

            return self._room_response(conn, room_id)

    def create_invite(self, room_id: str, invited_by_player_id: str, invited_player_id: str):
        if invited_by_player_id == invited_player_id:
            raise HTTPException(status_code=400, detail={"error": "cannot invite yourself"})

        with connection() as conn:
            with conn.transaction():
                room = self.rooms.lock_room(conn, room_id)

                if not room:
                    raise HTTPException(status_code=404, detail={"error": "room not found"})

                if not self.rooms.is_player_in_room(conn, room_id, invited_by_player_id):
                    raise HTTPException(status_code=403, detail={"error": "inviter is not in room"})

                if self.rooms.is_player_in_room(conn, room_id, invited_player_id):
                    raise HTTPException(status_code=409, detail={"error": "player already in room"})

                if self.rooms.player_count(conn, room_id) >= MAX_ROOM_PLAYERS:
                    raise HTTPException(status_code=409, detail={"error": "room is full"})

                invite = self.invites.create(
                    conn,
                    self._new_invite_id(),
                    room,
                    invited_by_player_id,
                    invited_player_id,
                )
                return self._invite_response(invite)

    def get_invite(self, invite_id: str):
        with connection() as conn:
            invite = self.invites.get(conn, invite_id)

            if not invite:
                raise HTTPException(status_code=404, detail={"error": "invite not found"})

            return self._invite_response(invite)

    def accept_invite(self, invite_id: str, player_id: str):
        with connection() as conn:
            with conn.transaction():
                invite = self.invites.lock(conn, invite_id)

                if not invite:
                    raise HTTPException(status_code=404, detail={"error": "invite not found"})

                self._ensure_invite_owner(invite, player_id)
                self._ensure_pending_invite(conn, invite)

                room = self.rooms.lock_room(conn, invite["room_id"])

                if not room:
                    raise HTTPException(status_code=404, detail={"error": "room not found"})

                if self.rooms.player_count(conn, room["room_id"]) >= MAX_ROOM_PLAYERS:
                    raise HTTPException(status_code=409, detail={"error": "room is full"})

                self.rooms.remove_player_from_other_rooms(conn, player_id, room["room_id"])
                self.rooms.add_player(conn, room["room_id"], player_id)
                self.rooms.close_if_full(conn, room["room_id"], MAX_ROOM_PLAYERS)
                invite = self.invites.mark_status(conn, invite_id, "ACCEPTED")

                return {
                    "invite": self._invite_response(invite),
                    "room": self._room_response(conn, room["room_id"]),
                }

    def reject_invite(self, invite_id: str, player_id: str):
        with connection() as conn:
            with conn.transaction():
                invite = self.invites.lock(conn, invite_id)

                if not invite:
                    raise HTTPException(status_code=404, detail={"error": "invite not found"})

                self._ensure_invite_owner(invite, player_id)
                self._ensure_pending_invite(conn, invite)
                invite = self.invites.mark_status(conn, invite_id, "REJECTED")
                return self._invite_response(invite)

    def _room_response(self, conn, room_id: str):
        room = self.rooms.get(conn, room_id)
        players = [player["user_id"] for player in self.rooms.list_players(conn, room_id)]

        return {
            "roomId": room["room_id"],
            "gameId": room["game_id"],
            "status": room["status"],
            "capacity": MAX_ROOM_PLAYERS,
            "playerCount": len(players),
            "players": players,
        }

    def _invite_response(self, invite):
        return {
            "inviteId": invite["invite_id"],
            "roomId": invite["room_id"],
            "gameId": invite["game_id"],
            "invitedByPlayerId": invite["invited_by_user_id"],
            "invitedPlayerId": invite["invited_user_id"],
            "status": invite["status"],
            "createdAt": invite["created_at"],
            "expiresAt": invite["expires_at"],
        }

    def _ensure_invite_owner(self, invite, player_id: str):
        if invite["invited_user_id"] != player_id:
            raise HTTPException(status_code=403, detail={"error": "invite is for another player"})

    def _ensure_pending_invite(self, conn, invite):
        if invite["status"] != "PENDING":
            raise HTTPException(status_code=409, detail={"error": "invite is not pending"})

        if invite["expires_at"] <= conn.execute("select now() as now").fetchone()["now"]:
            self.invites.mark_status(conn, invite["invite_id"], "EXPIRED")
            raise HTTPException(status_code=409, detail={"error": "invite expired"})

    def _new_room_id(self):
        return f"room-{uuid4()}"

    def _new_invite_id(self):
        return f"invite-{uuid4()}"
