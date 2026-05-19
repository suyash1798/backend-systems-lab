class MessageRouter {
  constructor({ playHandler, eventBus, roomNotifier }) {
    this.playHandler = playHandler;
    this.eventBus = eventBus;
    this.roomNotifier = roomNotifier;
  }

  async handleMessage(ws, msg, send) {
    try {
      const payload = JSON.parse(msg);
      return await this.routeMessage(ws, payload, send);
    } catch (err) {
      send(ws, { status: 'error', error: 'invalid json' });
    }
  }

  async routeMessage(ws, payload, send) {
    if (payload.action === 'ping') {
      return this.handlePing(ws, payload, send);
    }

    if (payload.action === 'join') {
      return await this.handleJoin(ws, payload, send);
    }

    if (payload.action === 'play') {
      return await this.handlePlay(ws, payload, send);
    }

    return send(ws, {
      status: 'error',
      error: 'invalid message',
      requestId: payload.requestId || null
    });
  }

  handlePing(ws, payload, send) {
    send(ws, {
      status: 'ok',
      action: 'pong',
      requestId: payload.requestId || null
    });
  }

  async handleJoin(ws, payload, send) {
    if (!payload.userId || !payload.roomId) {
      return send(ws, {
        status: 'error',
        error: 'userId and roomId required',
        requestId: payload.requestId || null
      });
    }

    this.roomNotifier.assignClient(ws, {
      userId: payload.userId,
      roomId: payload.roomId
    });

    send(ws, {
      status: 'ok',
      action: 'joined',
      userId: ws.userId,
      roomId: ws.roomId,
      requestId: payload.requestId || null
    });

    await this.eventBus.publish({
      type: 'player_joined',
      userId: ws.userId,
      roomId: ws.roomId,
      requestId: payload.requestId || null,
      sourceConnectionId: ws.id
    });
  }

  async handlePlay(ws, payload, send) {
    if (!payload.userId) {
      return send(ws, {
        status: 'error',
        error: 'invalid message',
        requestId: payload.requestId || null
      });
    }

    try {
      this.roomNotifier.assignClient(ws, {
        userId: payload.userId,
        roomId: payload.roomId || ws.roomId || 'global'
      });

      const data = await this.playHandler(payload.userId);
      send(ws, {
        status: 'ok',
        balance: data.balance,
        requestId: payload.requestId || null
      });

      await this.eventBus.publish({
        type: 'player_action',
        action: 'play',
        userId: payload.userId,
        roomId: ws.roomId,
        balance: data.balance,
        requestId: payload.requestId || null,
        sourceConnectionId: ws.id
      });
    } catch (err) {
      send(ws, {
        status: 'error',
        error: err.message,
        detail: err.detail || null,
        requestId: payload.requestId || null
      });
    }
  }
}

module.exports = MessageRouter;
