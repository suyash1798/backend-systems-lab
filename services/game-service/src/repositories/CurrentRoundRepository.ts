import { randomUUID } from 'crypto';
import RedisKeyValueClient from '../infra/RedisKeyValueClient';
import { ActiveRound, RoundAction } from '../game/models/Round';

class CurrentRoundRepository {
  constructor(private readonly redis: RedisKeyValueClient) {}

  async get(userId: string, roomId: string): Promise<ActiveRound | null> {
    const value = await this.redis.get(this.key(userId, roomId));
    return value ? this.normalize(JSON.parse(value) as Partial<ActiveRound>) : null;
  }

  async getOrCreate(userId: string, roomId: string): Promise<ActiveRound> {
    const existing = await this.get(userId, roomId);

    if (existing) {
      return existing;
    }

    const round: ActiveRound = {
      roundId: randomUUID(),
      userId,
      roomId,
      status: 'ACTIVE',
      spinCount: 0,
      lastSpinId: 0,
      history: []
    };

    await this.save(round);
    return round;
  }

  async recordSpin(round: ActiveRound, spinId: number): Promise<ActiveRound> {
    const updated = {
      ...round,
      spinCount: round.spinCount + 1,
      lastSpinId: spinId
    };
    await this.save(updated);
    return updated;
  }

  async restore(round: ActiveRound): Promise<void> {
    await this.save(round);
  }

  async history(userId: string, roomId: string): Promise<RoundAction[]> {
    const round = await this.get(userId, roomId);
    return round?.history || [];
  }

  async recordAction(
    round: ActiveRound,
    action: Omit<RoundAction, 'createdAt'>
  ): Promise<ActiveRound> {
    const latest = await this.get(round.userId, round.roomId);

    if (!latest) {
      return round;
    }

    const updated = {
      ...latest,
      history: [
        ...latest.history,
        {
          ...action,
          createdAt: new Date().toISOString()
        }
      ]
    };

    await this.save(updated);
    return updated;
  }

  async complete(userId: string, roomId: string): Promise<ActiveRound | null> {
    const round = await this.get(userId, roomId);

    if (!round) {
      return null;
    }

    await this.redis.del(this.key(userId, roomId));
    return round;
  }

  private async save(round: ActiveRound): Promise<void> {
    await this.redis.set(this.key(round.userId, round.roomId), JSON.stringify(round));
  }

  private normalize(round: Partial<ActiveRound>): ActiveRound {
    return {
      roundId: round.roundId || '',
      userId: round.userId || '',
      roomId: round.roomId || '',
      status: 'ACTIVE',
      spinCount: round.spinCount || 0,
      lastSpinId: round.lastSpinId || round.spinCount || 0,
      history: round.history || []
    };
  }

  private key(userId: string, roomId: string): string {
    return `current-round:${userId}:${roomId}`;
  }
}

export default CurrentRoundRepository;
