const WebSocket = require('ws');

class RoomNotifier {
  constructor({ clients, send }) {
    this.clients = clients;
    this.send = send;
  }

  assignClient(ws, { userId, roomId }) {
    ws.userId = userId;
    ws.roomId = roomId;
  }

  notifyRoom(event) {
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

  broadcastToRoom(roomId, payload, { excludeConnectionId = null } = {}) {
    this.clients.forEach((client) => {
      if (client.roomId !== roomId || client.id === excludeConnectionId) {
        return;
      }

      if (client.readyState === WebSocket.OPEN) {
        this.send(client, payload);
      }
    });
  }
}

module.exports = RoomNotifier;
