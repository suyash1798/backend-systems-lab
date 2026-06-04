import { Prisma, PrismaClient } from '@prisma/client';
import {
  ChessColor,
  ChessGameSnapshot,
  ChessGameState,
  ChessMoveHistory,
  ChessMoveRecord
} from './types';

type Transaction = Prisma.TransactionClient;

class Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async withLockedGame<T>(
    roomId: string,
    initialFen: string,
    handler: (tx: Transaction, game: ChessGameState) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        insert into chess_games (
          chess_game_id,
          room_id,
          current_fen,
          status,
          turn
        )
        values (
          ${`chess:${roomId}`},
          ${roomId},
          ${initialFen},
          'ACTIVE',
          'w'
        )
        on conflict (room_id) do nothing
      `;

      const rows = await tx.$queryRaw<ChessGameRow[]>`
        select
          chess_game_id as "chessGameId",
          room_id as "roomId",
          current_fen as "currentFen",
          status,
          turn,
          move_number as "moveNumber",
          white_user_id as "whiteUserId",
          black_user_id as "blackUserId"
        from chess_games
        where room_id = ${roomId}
        for update
      `;

      if (!rows[0]) {
        throw new Error('chess game not found');
      }

      return handler(tx, this.toGame(rows[0]));
    });
  }

  async updateGame(tx: Transaction, game: ChessGameState): Promise<void> {
    await tx.$executeRaw`
      update chess_games
      set current_fen = ${game.currentFen},
          status = ${game.status},
          turn = ${game.turn},
          move_number = ${game.moveNumber},
          white_user_id = ${game.whiteUserId},
          black_user_id = ${game.blackUserId},
          updated_at = now()
      where chess_game_id = ${game.chessGameId}
    `;
  }

  async saveMove(tx: Transaction, move: ChessMoveRecord): Promise<void> {
    await tx.$executeRaw`
      insert into chess_moves (
        chess_game_id,
        move_number,
        user_id,
        color,
        from_square,
        to_square,
        promotion,
        san,
        lan,
        fen_after
      )
      values (
        ${move.chessGameId},
        ${move.moveNumber},
        ${move.userId},
        ${move.color},
        ${move.from},
        ${move.to},
        ${move.promotion},
        ${move.san},
        ${move.lan},
        ${move.fenAfter}
      )
      on conflict (chess_game_id, move_number) do nothing
    `;
  }

  async findByRoom(roomId: string): Promise<ChessGameSnapshot | null> {
    const games = await this.prisma.$queryRaw<ChessGameRow[]>`
      select
        chess_game_id as "chessGameId",
        room_id as "roomId",
        current_fen as "currentFen",
        status,
        turn,
        move_number as "moveNumber",
        white_user_id as "whiteUserId",
        black_user_id as "blackUserId"
      from chess_games
      where room_id = ${roomId}
      limit 1
    `;

    if (!games[0]) {
      return null;
    }

    const moves = await this.prisma.$queryRaw<ChessMoveRow[]>`
      select
        chess_game_id as "chessGameId",
        move_number as "moveNumber",
        user_id as "userId",
        color,
        from_square as "from",
        to_square as "to",
        promotion,
        san,
        lan,
        fen_after as "fenAfter",
        created_at as "createdAt"
      from chess_moves
      where chess_game_id = ${games[0].chessGameId}
      order by move_number
    `;

    return {
      ...this.toGame(games[0]),
      moves: moves.map((move) => ({
        ...move,
        createdAt: move.createdAt.toISOString()
      }))
    };
  }

  private toGame(row: ChessGameRow): ChessGameState {
    return {
      chessGameId: row.chessGameId,
      roomId: row.roomId,
      currentFen: row.currentFen,
      status: row.status,
      turn: row.turn,
      moveNumber: row.moveNumber,
      whiteUserId: row.whiteUserId,
      blackUserId: row.blackUserId
    };
  }
}

interface ChessGameRow {
  chessGameId: string;
  roomId: string;
  currentFen: string;
  status: string;
  turn: ChessColor;
  moveNumber: number;
  whiteUserId: string | null;
  blackUserId: string | null;
}

interface ChessMoveRow extends Omit<ChessMoveHistory, 'createdAt'> {
  createdAt: Date;
}

export default Repository;
