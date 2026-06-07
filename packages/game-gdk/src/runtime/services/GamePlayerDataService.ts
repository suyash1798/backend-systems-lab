import { GamePlayerDataStore } from '../types';

export interface PersistentDataResponse {
  status: 'ok';
  action: 'persistent_data';
  requestId: string;
  gameId: string;
}

class GamePlayerDataService {
  constructor(private readonly store: GamePlayerDataStore) {}

  async save(request: {
    userId: string;
    requestId: string;
    gameId: string;
    data: Record<string, unknown>;
  }): Promise<PersistentDataResponse> {
    const { userId, requestId, gameId, data } = request;

    await this.store.save({ userId, gameId, data });

    return {
      status: 'ok',
      action: 'persistent_data',
      requestId,
      gameId
    };
  }
}

export default GamePlayerDataService;
