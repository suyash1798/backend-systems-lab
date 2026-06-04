export type ChessColor = 'w' | 'b';

export interface ChessMovePayload {
  action: 'chess_move';
  requestId: string;
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface ChessGameState {
  chessGameId: string;
  roomId: string;
  currentFen: string;
  status: string;
  turn: ChessColor;
  moveNumber: number;
  whiteUserId: string | null;
  blackUserId: string | null;
}

export interface ChessMoveRecord {
  chessGameId: string;
  moveNumber: number;
  userId: string;
  color: ChessColor;
  from: string;
  to: string;
  promotion: string | null;
  san: string;
  lan: string;
  fenAfter: string;
}

export interface ChessMoveHistory extends ChessMoveRecord {
  createdAt: string;
}

export interface ChessGameSnapshot extends ChessGameState {
  moves: ChessMoveHistory[];
}
