import { ActiveRound, GameRuntimeContext } from '@trying-sd/game-gdk';
import SpinRepository from './Repository';
import { SlotEvent } from './types';

const symbols = ['CHERRY', 'LEMON', 'BELL', 'SEVEN'];

interface SpinRequest {
  userId: string;
  roomId: string;
  requestId: string;
  gameId: string;
  spinId: string;
  betAmount: number;
}

export interface SpinResponse {
  status: 'ok';
  action: 'spin';
  requestId: string;
  roundId: string;
  gameId: string;
  spinId: string;
  betAmount: number;
  symbols: string[];
  winAmount: number;
  balance: number;
  jackpotContributions?: {
    jackpotName: string;
    amount: number;
    currentAmount: number;
  }[];
}

class SpinService {
  constructor(
    private readonly game: GameRuntimeContext<SlotEvent>,
    private readonly repository: SpinRepository,
  ) {}

  async spin(request: SpinRequest): Promise<SpinResponse> {
    const round = await this.activeRound(request.userId, request.roomId);
    const spinNumber = this.spinNumber(request.spinId);

    const existing = await this.repository.findCompletedByRoundAndSpinId(
      round.roundId,
      request.spinId
    );

    if (existing) {
      return {
        status: 'ok',
        action: 'spin',
        requestId: existing.requestId,
        roundId: existing.roundId,
        gameId: existing.gameId,
        spinId: existing.spinId,
        betAmount: existing.betAmount,
        symbols: existing.symbols,
        winAmount: existing.winAmount,
        balance: existing.balance
      };
    }

    if (spinNumber <= round.lastSpinId) {
      throw new Error(`spinId must be greater than ${round.lastSpinId}`);
    }

    const pendingSpin = await this.repository.createPendingSpin({
      userId: request.userId,
      roomId: request.roomId,
      roundId: round.roundId,
      gameId: request.gameId,
      requestId: request.requestId,
      spinId: request.spinId,
      betAmount: request.betAmount
    });

    if (!pendingSpin.created) {
      throw new Error('spin already pending');
    }

    const walletTransactionPrefix = `wallet:spin:${pendingSpin.id.toString()}`;
    let debit;

    try {
      debit = await this.game.wallet.deduct({
        userId: request.userId,
        amount: request.betAmount,
        transactionId: `${walletTransactionPrefix}:bet`,
        gameId: request.gameId,
        referenceId: pendingSpin.id.toString()
      });
    } catch (err) {
      await this.repository.markFailed(pendingSpin.id);
      throw err;
    }

    const result = this.roll(request.betAmount);
    let balance = debit.balance;

    if (result.winAmount > 0) {
      const credit = await this.game.wallet.credit({
        userId: request.userId,
        amount: result.winAmount,
        transactionId: `${walletTransactionPrefix}:win`,
        referenceId: pendingSpin.id.toString()
      });
      balance = credit.balance;
    }

    const completedSpin = {
      userId: request.userId,
      roomId: request.roomId,
      roundId: round.roundId,
      gameId: request.gameId,
      requestId: request.requestId,
      spinId: request.spinId,
      betAmount: request.betAmount,
      winAmount: result.winAmount,
      symbols: result.symbols,
      balance
    };

    const response: SpinResponse = {
      status: 'ok',
      action: 'spin',
      requestId: request.requestId,
      roundId: round.roundId,
      gameId: request.gameId,
      spinId: request.spinId,
      betAmount: request.betAmount,
      symbols: result.symbols,
      winAmount: result.winAmount,
      balance,
      jackpotContributions: debit.jackpotContributions
    };

    await this.repository.completeSpin(pendingSpin.id, completedSpin);
    await this.game.gameEvents.actionCompleted(
      'spin',
      {
        userId: request.userId,
        roomId: request.roomId,
        roundId: response.roundId,
        gameId: response.gameId,
        requestId: response.requestId,
        spinId: response.spinId,
        betAmount: response.betAmount,
        winAmount: response.winAmount,
        symbols: response.symbols,
        balance: response.balance
      },
      `spin_completed:${request.userId}:${response.roundId}:${response.spinId}`
    );
    const updatedRound = await this.game.rounds.recordSpin(round, spinNumber);
    await this.game.rounds.recordActionIfActive(updatedRound.userId, updatedRound.roomId, {
      action: 'spin',
      requestId: request.requestId,
      payload: {
        gameId: request.gameId,
        spinId: request.spinId,
        betAmount: request.betAmount
      },
      result: {
        roundId: response.roundId,
        symbols: response.symbols,
        winAmount: response.winAmount,
        balance: response.balance
      }
    });

    return response;
  }

  private async activeRound(userId: string, roomId: string): Promise<ActiveRound> {
    return this.game.rounds.activeOrCreate(userId, roomId);
  }

  private spinNumber(spinId: string): number {
    const spinNumber = Number(spinId);

    if (!Number.isInteger(spinNumber) || spinNumber <= 0) {
      throw new Error('spinId must be a positive number');
    }

    return spinNumber;
  }

  private roll(betAmount: number): { symbols: string[]; winAmount: number } {
    const result = [this.randomSymbol(), this.randomSymbol(), this.randomSymbol()];

    return {
      symbols: result,
      winAmount: this.calculateWin(result, betAmount)
    };
  }

  private randomSymbol(): string {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  private calculateWin(result: string[], betAmount: number): number {
    const uniqueSymbols = new Set(result).size;

    if (uniqueSymbols === 1) {
      return betAmount * 5;
    }

    if (uniqueSymbols === 2) {
      return betAmount * 2;
    }

    return 0;
  }
}

export default SpinService;
