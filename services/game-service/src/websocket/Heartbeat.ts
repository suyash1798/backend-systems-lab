import { WebSocket, WebSocketServer } from 'ws';
import { GameSocket } from '../types/websocket';

class Heartbeat {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly wss: WebSocketServer,
    private readonly intervalMs: number
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      this.wss.clients.forEach((ws) => this.ping(ws as GameSocket));
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private ping(ws: GameSocket): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (ws.isAlive === false) {
      console.log('ws: terminating stale client');
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();
  }
}

export default Heartbeat;
