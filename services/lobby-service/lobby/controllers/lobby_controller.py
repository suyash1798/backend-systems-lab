from fastapi import APIRouter, Header

from lobby.models import CreateInviteRequest
from lobby.services import AuthService, LobbyService


router = APIRouter()
auth_service = AuthService()
lobby_service = LobbyService()


@router.get("/")
def health():
    return {"status": "ok", "service": "lobby-service"}


@router.post("/games/{game_id}/load")
def load_game(
    game_id: str,
    authorization: str | None = Header(default=None),
):
    player_id = auth_service.player_id(authorization)
    return lobby_service.load_game(game_id, player_id)


@router.get("/rooms/{room_id}")
def get_room(room_id: str):
    return lobby_service.get_room(room_id)


@router.post("/rooms/{room_id}/invites")
def create_invite(
    room_id: str,
    request: CreateInviteRequest,
    authorization: str | None = Header(default=None),
):
    player_id = auth_service.player_id(authorization)
    return lobby_service.create_invite(room_id, player_id, request.invitedPlayerId)


@router.get("/invites/{invite_id}")
def get_invite(invite_id: str):
    return lobby_service.get_invite(invite_id)


@router.post("/invites/{invite_id}/accept")
def accept_invite(
    invite_id: str,
    authorization: str | None = Header(default=None),
):
    player_id = auth_service.player_id(authorization)
    return lobby_service.accept_invite(invite_id, player_id)


@router.post("/invites/{invite_id}/reject")
def reject_invite(
    invite_id: str,
    authorization: str | None = Header(default=None),
):
    player_id = auth_service.player_id(authorization)
    return lobby_service.reject_invite(invite_id, player_id)
