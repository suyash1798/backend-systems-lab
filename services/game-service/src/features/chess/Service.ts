import { Chess, Square } from 'chess.js';
import AppError from '../../errors/AppError';
import Repository from './Repository';
import { ChessColor, ChessGameSnapshot, ChessGameState } from './types';

export interface ChessMoveRequest {
  userId: string;
  roomId: string;
  requestId: string;
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface ChessMoveResponse {
  status: 'ok';
  action: 'chess_move';
  requestId: string;
  chessGameId: string;
  roomId: string;
  moveNumber: number;
  playerColor: ChessColor;
  from: string;
  to: string;
  promotion: string | null;
  san: string;
  lan: string;
  fen: string;
  turn: ChessColor;
  gameStatus: string;
}

class Service {
  private readonly initialFen = new Chess().fen();

  constructor(private readonly repository: Repository) {}

  async state(roomId: string): Promise<ChessGameSnapshot | null> {
    return this.repository.findByRoom(roomId);
  }

  async move(request: ChessMoveRequest): Promise<ChessMoveResponse> {
    return this.repository.withLockedGame(request.roomId, this.initialFen, async (tx, game) => {
      if (game.status !== 'ACTIVE') {
        throw new AppError('chess game completed', 409);
      }

      const playerColor = this.playerColor(game, request.userId);
      const chess = new Chess(game.currentFen);

      if (chess.turn() !== playerColor) {
        throw new AppError('not your turn', 409);
      }

      const move = this.applyMove(chess, request);
      const nextGame = this.nextGameState(game, chess, request.userId, playerColor);

      await this.repository.updateGame(tx, nextGame);
      await this.repository.saveMove(tx, {
        chessGameId: nextGame.chessGameId,
        moveNumber: nextGame.moveNumber,
        userId: request.userId,
        color: playerColor,
        from: request.from,
        to: request.to,
        promotion: request.promotion || null,
        san: move.san,
        lan: move.lan,
        fenAfter: nextGame.currentFen
      });

      return {
        status: 'ok',
        action: 'chess_move',
        requestId: request.requestId,
        chessGameId: nextGame.chessGameId,
        roomId: request.roomId,
        moveNumber: nextGame.moveNumber,
        playerColor,
        from: request.from,
        to: request.to,
        promotion: request.promotion || null,
        san: move.san,
        lan: move.lan,
        fen: nextGame.currentFen,
        turn: nextGame.turn,
        gameStatus: nextGame.status
      };
    });
  }

  private playerColor(game: ChessGameState, userId: string): ChessColor {
    if (!game.whiteUserId || game.whiteUserId === userId) {
      return 'w';
    }

    if (!game.blackUserId || game.blackUserId === userId) {
      return 'b';
    }

    throw new AppError('chess game is full', 403);
  }

  private applyMove(chess: Chess, request: ChessMoveRequest) {
    try {
      return chess.move({
        from: request.from as Square,
        to: request.to as Square,
        promotion: request.promotion
      });
    } catch (err) {
      throw new AppError('invalid chess move', 400);
    }
  }

  private nextGameState(
    game: ChessGameState,
    chess: Chess,
    userId: string,
    playerColor: ChessColor
  ): ChessGameState {
    return {
      ...game,
      currentFen: chess.fen(),
      status: this.status(chess),
      turn: chess.turn() as ChessColor,
      moveNumber: game.moveNumber + 1,
      whiteUserId: playerColor === 'w' ? userId : game.whiteUserId,
      blackUserId: playerColor === 'b' ? userId : game.blackUserId
    };
  }

  private status(chess: Chess): string {
    if (chess.isCheckmate()) {
      return 'CHECKMATE';
    }

    if (chess.isDraw()) {
      return 'DRAW';
    }

    if (chess.isGameOver()) {
      return 'DONE';
    }

    return 'ACTIVE';
  }
}

export default Service;
