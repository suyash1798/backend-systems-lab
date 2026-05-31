import AppError from '../../errors/AppError';
import CurrentRoundRepository from '../../repositories/CurrentRoundRepository';
import RoundActionRepository from '../../repositories/RoundActionRepository';
import RoundRepository from '../../repositories/RoundRepository';
import { RoundAction } from '../models/Round';

export interface EndRoundResponse {
  status: 'ok';
  action: 'end_round';
  requestId: string;
  roundId: string;
  spinCount: number;
}

class RoundService {
  constructor(
    private readonly currentRoundRepository: CurrentRoundRepository,
    private readonly roundRepository: RoundRepository,
    private readonly roundActionRepository: RoundActionRepository
  ) {}

  async endRound({
    userId,
    roomId,
    requestId
  }: {
    userId: string;
    roomId: string;
    requestId: string;
  }): Promise<EndRoundResponse> {
    const round = await this.currentRoundRepository.complete(userId, roomId);

    if (!round) {
      throw new AppError('active round not found', 404);
    }

    await this.roundRepository.complete(round);

    return {
      status: 'ok',
      action: 'end_round',
      requestId,
      roundId: round.roundId,
      spinCount: round.spinCount
    };
  }

  async history(userId: string, roomId: string): Promise<RoundAction[]> {
    const round = await this.currentRoundRepository.get(userId, roomId)
      || await this.roundRepository.findActive(userId, roomId);

    if (!round) {
      return [];
    }

    const history = await this.roundActionRepository.listForRound(round.roundId);

    if (history.length > 0 && round.history.length === 0) {
      await this.currentRoundRepository.restore({ ...round, history });
    }

    return history;
  }

  async recordActionIfActive(
    userId: string,
    roomId: string,
    action: Omit<RoundAction, 'createdAt'>
  ): Promise<void> {
    const round = await this.currentRoundRepository.get(userId, roomId);

    if (!round) {
      return;
    }

    await this.roundActionRepository.save({
      roundId: round.roundId,
      userId,
      roomId,
      ...action
    });
    await this.currentRoundRepository.recordAction(round, action);
  }
}

export default RoundService;
