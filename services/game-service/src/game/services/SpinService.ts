import CurrentRoundRepository from '../../repositories/CurrentRoundRepository';
import RoundRepository from '../../repositories/RoundRepository';
import SpinRepository from '../../repositories/SpinRepository';
import { WalletCreditHandler, WalletDeductHandler } from '../actions/types';
import { ActiveRound } from '../models/Round';

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
    private readonly deductWallet: WalletDeductHandler,
    private readonly creditWallet: WalletCreditHandler,
    private readonly currentRoundRepository: CurrentRoundRepository,
    private readonly roundRepository: RoundRepository,
    private readonly spinRepository: SpinRepository
  ) {}

  async spin(request: SpinRequest): Promise<SpinResponse> {
    const round = await this.activeRound(request.userId, request.roomId);
    const spinNumber = this.spinNumber(request.spinId);

    const existing = await this.spinRepository.findCompletedByUserRoundAndSpinId(
      request.userId,
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

    await this.roundRepository.saveStarted(round);

    const debit = await this.deductWallet({
      userId: request.userId,
      amount: request.betAmount,
      transactionId: `wallet:${request.userId}:${request.spinId}:bet`,
      gameId: request.gameId,
      referenceId: request.spinId
    });
    const result = this.roll(request.betAmount);
    let balance = debit.balance;

    if (result.winAmount > 0) {
      const credit = await this.creditWallet({
        userId: request.userId,
        amount: result.winAmount,
        transactionId: `wallet:${request.userId}:${request.spinId}:win`,
        referenceId: request.spinId
      });
      balance = credit.balance;
    }

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

    await this.spinRepository.saveCompletedSpin({
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
    });
    const updatedRound = await this.currentRoundRepository.recordSpin(round, spinNumber);
    await this.currentRoundRepository.recordAction(updatedRound, {
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
    const cached = await this.currentRoundRepository.get(userId, roomId);

    if (cached) {
      return cached;
    }

    const persisted = await this.roundRepository.findActive(userId, roomId);

    if (persisted) {
      await this.currentRoundRepository.restore(persisted);
      return persisted;
    }

    return this.currentRoundRepository.getOrCreate(userId, roomId);
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
