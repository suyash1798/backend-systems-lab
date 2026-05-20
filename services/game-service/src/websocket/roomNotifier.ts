import { WebSocket } from 'ws';
import { PlayerEvent } from '../types/events';
import { GameSocket, OutgoingPayload, SendFn } from '../types/websocket';

class RoomNotifier {
  private readonly clients: Set<WebSocket>;
  private readonly send: SendFn;

  constructor({ clients, send }: { clients: Set<WebSocket>; send: SendFn }) {
    this.clients = clients;
    this.send = send;
  }

  assignClient(ws: GameSocket, { userId, roomId }: { userId: string; roomId: string }): void {
    ws.userId = userId;
    ws.roomId = roomId;
  }

  notifyRoom(event: PlayerEvent): void {
    if (!event.roomId) {
      return;
    }

    this.broadcastToRoom(event.roomId, {
      type: 'notification',
      event
    }, {
      excludeConnectionId: event.sourceConnectionId
    });
  }

  broadcastToRoom(
    roomId: string,
    payload: OutgoingPayload,
    { excludeConnectionId = null }: { excludeConnectionId?: string | null } = {}
  ): void {
    this.clients.forEach((client) => {
      const gameClient = client as GameSocket;

      if (gameClient.roomId !== roomId || gameClient.id === excludeConnectionId) {
        return;
      }

      if (gameClient.readyState === WebSocket.OPEN) {
        this.send(gameClient, payload);
      }
    });
  }
}

export default RoomNotifier;
