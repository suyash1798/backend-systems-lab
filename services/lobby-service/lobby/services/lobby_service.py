from uuid import uuid4

from fastapi import HTTPException

from lobby.database import connection
from lobby.repositories import RoomRepository

MAX_ROOM_PLAYERS = 5


class LobbyService:
    def __init__(self):
        self.rooms = RoomRepository()

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

    def _new_room_id(self):
        return f"room-{uuid4()}"
