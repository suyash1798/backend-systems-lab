import { GameSocket } from "../types/websocket";

class GameResponseSender {
  ok(ws: GameSocket, payload: object): void {
    this.send(ws, { status: "ok", ...payload });
  }

  error(ws: GameSocket, error: string, requestId?: string, detail?: any): void {
    this.send(ws, { status: "error", error, detail, requestId });
  }

  pending(ws: GameSocket, requestId?: string | null): void {
    this.send(ws, { status: "pending", duplicate: true, requestId });
  }

  duplicate(ws: GameSocket, response: object): void {
    this.send(ws, { ...response, duplicate: true });
  }

  private send(ws: GameSocket, payload: object): void {
    ws.send(JSON.stringify(payload));
  }
}

export default GameResponseSender;
