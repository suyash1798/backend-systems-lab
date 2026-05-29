from datetime import datetime, timedelta, timezone
from random import randint

import jwt

from user.config import JWT_SECRET, JWT_TTL_SECONDS
from user.database import connection
from user.models import DeviceLoginRequest
from user.repositories import PlayerRepository


class UserService:
    def __init__(self):
        self.players = PlayerRepository()

    def login_device(self, request: DeviceLoginRequest):
        with connection() as conn:
            with conn.transaction():
                player = self.players.get_by_device(conn, request.deviceId)

                if not player:
                    player = self.players.create(conn, self._new_player_id(conn), request.deviceId)

                self.players.mark_seen(conn, player["player_id"])
                token = self._token(player["player_id"], player["device_id"])

                return {
                    "playerId": player["player_id"],
                    "accessToken": token,
                    "tokenType": "Bearer",
                    "expiresIn": JWT_TTL_SECONDS,
                }

    def _token(self, player_id: str, device_id: str):
        now = datetime.now(timezone.utc)
        payload = {
            "sub": player_id,
            "deviceId": device_id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=JWT_TTL_SECONDS)).timestamp()),
        }
        return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    def _new_player_id(self, conn):
        for _ in range(10):
            player_id = str(randint(100000, 999999))

            if not self.players.exists(conn, player_id):
                return player_id

        raise RuntimeError("could not generate player id")
