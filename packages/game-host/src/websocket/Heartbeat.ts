import { WebSocketServer } from 'ws';
import { GameSocket } from '@trying-sd/game-gdk';

class Heartbeat {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly wss: WebSocketServer,
    private readonly intervalMs: number
  ) {}

  start(): void {
    this.interval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client as GameSocket;

        if (!ws.isAlive) {
          console.log('ws: terminating stale client');
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export default Heartbeat;
