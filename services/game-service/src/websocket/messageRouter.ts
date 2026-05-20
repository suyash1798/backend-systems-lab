import EventBus from '../events/eventBus';
import { WalletAdjustResponse, WalletError } from '../types/wallet';
import { GameSocket, IncomingMessagePayload, JoinPayload, PlayPayload, SendFn } from '../types/websocket';
import RoomNotifier from './roomNotifier';

type PlayHandler = (userId: string) => Promise<WalletAdjustResponse>;

class MessageRouter {
  private readonly playHandler: PlayHandler;
  private readonly eventBus: EventBus;
  private readonly roomNotifier: RoomNotifier;

  constructor({
    playHandler,
    eventBus,
    roomNotifier
  }: {
    playHandler: PlayHandler;
    eventBus: EventBus;
    roomNotifier: RoomNotifier;
  }) {
    this.playHandler = playHandler;
    this.eventBus = eventBus;
    this.roomNotifier = roomNotifier;
  }

  async handleMessage(ws: GameSocket, msg: Buffer, send: SendFn): Promise<void> {
    try {
      const payload = JSON.parse(msg.toString()) as IncomingMessagePayload;
      await this.routeMessage(ws, payload, send);
    } catch (err) {
      send(ws, { status: 'error', error: 'invalid json' });
    }
  }

  private async routeMessage(ws: GameSocket, payload: IncomingMessagePayload, send: SendFn): Promise<void> {
    if (payload.action === 'ping') {
      this.handlePing(ws, payload, send);
      return;
    }

    if (payload.action === 'join') {
      await this.handleJoin(ws, payload, send);
      return;
    }

    if (payload.action === 'play') {
      await this.handlePlay(ws, payload, send);
      return;
    }

    send(ws, {
      status: 'error',
      error: 'invalid message',
      requestId: payload.requestId || null
    });
  }

  private handlePing(ws: GameSocket, payload: IncomingMessagePayload, send: SendFn): void {
    send(ws, {
      status: 'ok',
      action: 'pong',
      requestId: payload.requestId || null
    });
  }

  private async handleJoin(ws: GameSocket, payload: IncomingMessagePayload, send: SendFn): Promise<void> {
    if (!this.isJoinPayload(payload)) {
      send(ws, {
        status: 'error',
        error: 'userId and roomId required',
        requestId: payload.requestId || null
      });
      return;
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
      userId: payload.userId,
      roomId: payload.roomId,
      requestId: payload.requestId || null,
      sourceConnectionId: ws.id
    });
  }

  private async handlePlay(ws: GameSocket, payload: IncomingMessagePayload, send: SendFn): Promise<void> {
    if (!this.isPlayPayload(payload)) {
      send(ws, {
        status: 'error',
        error: 'invalid message',
        requestId: payload.requestId || null
      });
      return;
    }

    try {
      const roomId = payload.roomId || ws.roomId || 'global';
      this.roomNotifier.assignClient(ws, {
        userId: payload.userId,
        roomId
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
        roomId,
        balance: data.balance,
        requestId: payload.requestId || null,
        sourceConnectionId: ws.id
      });
    } catch (err) {
      const walletErr = err as WalletError;
      send(ws, {
        status: 'error',
        error: walletErr.message,
        detail: walletErr.detail || null,
        requestId: payload.requestId || null
      });
    }
  }

  private isJoinPayload(payload: IncomingMessagePayload): payload is JoinPayload {
    return payload.action === 'join' && typeof payload.userId === 'string' && typeof payload.roomId === 'string';
  }

  private isPlayPayload(payload: IncomingMessagePayload): payload is PlayPayload {
    return payload.action === 'play' && typeof payload.userId === 'string';
  }
}

export default MessageRouter;
