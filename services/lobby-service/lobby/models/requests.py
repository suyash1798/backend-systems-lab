from pydantic import BaseModel


class LoadGameRequest(BaseModel):
    pass


class CreateInviteRequest(BaseModel):
    invitedPlayerId: str
