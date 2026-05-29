import { WebSocket } from 'ws';
import { PlayerEvent } from '../types/events';
import { GameSocket } from '../types/websocket';

class RoomRegistry {
  private readonly rooms = new Map<string, Set<GameSocket>>();

  sync(ws: GameSocket): void {
    this.remove(ws);

    if (!ws.roomId) {
      return;
    }

    const clients = this.rooms.get(ws.roomId) || new Set<GameSocket>();
    clients.add(ws);
    this.rooms.set(ws.roomId, clients);
  }

  remove(ws: GameSocket): void {
    this.rooms.forEach((clients, roomId) => {
      clients.delete(ws);

      if (clients.size === 0) {
        this.rooms.delete(roomId);
      }
    });
  }

  closeExistingUserConnection(userId: string, current: GameSocket): void {
    this.rooms.forEach((clients) => {
      clients.forEach((ws) => {
        if (ws !== current && ws.userId === userId && ws.readyState === WebSocket.OPEN) {
          ws.close(4000, 'new connection opened');
        }
      });
    });
  }

  notify(event: PlayerEvent): void {
    const clients = this.rooms.get(event.roomId);

    if (!clients) {
      return;
    }

    clients.forEach((ws) => {
      if (ws.id === event.sourceConnectionId || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      ws.send(JSON.stringify({ type: 'notification', event }));
    });
  }
}

export default RoomRegistry;
