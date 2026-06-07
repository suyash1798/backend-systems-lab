import GameError from '../../errors/GameError';
import {
  ActiveRound,
  CurrentRoundStore,
  RoundAction,
  RoundActionStore,
  RoundStore
} from '../types';

export interface EndRoundResponse {
  status: 'ok';
  action: 'end_round';
  requestId: string;
  roundId: string;
  spinCount: number;
}

class RoundService {
  constructor(
    private readonly currentRoundStore: CurrentRoundStore,
    private readonly roundStore: RoundStore,
    private readonly roundActionStore: RoundActionStore
  ) {}

  async endRound(request: {
    userId: string;
    roomId: string;
    requestId: string;
  }): Promise<EndRoundResponse> {
    const { userId, roomId, requestId } = request;
    const round = await this.activeRound(userId, roomId);

    if (!round) {
      throw new GameError('active round not found', 404);
    }

    await this.roundStore.complete(round);
    await this.currentRoundStore.clear(userId, roomId);

    return {
      status: 'ok',
      action: 'end_round',
      requestId,
      roundId: round.roundId,
      spinCount: round.spinCount
    };
  }

  async activeOrCreate(userId: string, roomId: string): Promise<ActiveRound> {
    const cached = await this.currentRoundStore.get(userId, roomId);

    if (cached) {
      return cached;
    }

    const persisted = await this.roundStore.findActive(userId, roomId);

    if (persisted) {
      await this.currentRoundStore.restore(persisted);
      return persisted;
    }

    const round = await this.currentRoundStore.getOrCreate(userId, roomId);
    await this.roundStore.saveStarted(round);
    return round;
  }

  async recordSpin(round: ActiveRound, spinId: number): Promise<ActiveRound> {
    return this.currentRoundStore.recordSpin(round, spinId);
  }

  async history(userId: string, roomId: string): Promise<RoundAction[]> {
    const round = await this.activeRound(userId, roomId);

    if (!round) {
      return [];
    }

    const history = await this.roundActionStore.listForRound(round.roundId);

    if (history.length > 0 && round.history.length === 0) {
      await this.currentRoundStore.restore({ ...round, history });
    }

    return history;
  }

  async recordActionIfActive(
    userId: string,
    roomId: string,
    action: Omit<RoundAction, 'createdAt'>
  ): Promise<void> {
    const round = await this.currentRoundStore.get(userId, roomId);

    if (!round) {
      return;
    }

    await this.roundActionStore.save({
      roundId: round.roundId,
      userId,
      roomId,
      ...action
    });
    await this.currentRoundStore.recordAction(round, action);
  }

  private async activeRound(userId: string, roomId: string): Promise<ActiveRound | null> {
    return this.currentRoundStore.get(userId, roomId)
      || this.roundStore.findActive(userId, roomId);
  }
}

export default RoundService;
