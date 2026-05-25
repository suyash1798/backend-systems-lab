import os
from threading import Lock

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class AdjustRequest(BaseModel):
    userId: str
    amount: int | float


app = FastAPI()
balances = {"user-1": 1000}
balance_lock = Lock()
default_balance = int(os.getenv("DEFAULT_BALANCE", "10000000"))


@app.get("/")
def health():
    return {"status": "ok", "service": "wallet-service"}


@app.get("/balance/{user_id}")
def get_balance(user_id: str):
    return {"userId": user_id, "balance": balances.get(user_id, default_balance)}


@app.post("/adjust")
def adjust_balance(request: AdjustRequest):
    with balance_lock:
        current_balance = balances.get(request.userId, default_balance)
        next_balance = current_balance + request.amount

        if next_balance < 0:
            raise HTTPException(status_code=400, detail={"error": "insufficient funds"})

        balances[request.userId] = next_balance
        return {"userId": request.userId, "balance": next_balance}
