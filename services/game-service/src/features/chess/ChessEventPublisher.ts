import RedisPubSub from '../../infra/redisPubSub';
import { GameSocket } from '../../types/websocket';
import { ChessMoveResponse } from './ChessService';

class ChessEventPublisher {
  constructor(
    private readonly pubSub: RedisPubSub,
    private readonly serverId: string
  ) {}

  async moveMade(ws: GameSocket, move: ChessMoveResponse): Promise<void> {
    await this.pubSub.publish({
      type: 'player_action',
      action: 'chess_move',
      userId: ws.userId!,
      roomId: ws.roomId!,
      requestId: move.requestId,
      chessGameId: move.chessGameId,
      moveNumber: move.moveNumber,
      playerColor: move.playerColor,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      lan: move.lan,
      fen: move.fen,
      turn: move.turn,
      gameStatus: move.gameStatus,
      sourceConnectionId: ws.id,
      serverId: this.serverId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default ChessEventPublisher;
