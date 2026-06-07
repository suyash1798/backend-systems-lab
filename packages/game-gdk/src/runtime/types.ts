import type {
  GameActionHandler,
  GameSocket,
  RequestLogger,
  RequestTrace,
  ResponseSender
} from '../types';

export interface JoinPayload {
  action: 'join';
  requestId: string;
  roomId: string;
  token: string;
  userId?: string;
}

export interface EndRoundPayload {
  action: 'end_round';
  requestId: string;
}

export interface PersistentDataPayload {
  action: 'persistent_data';
  requestId: string;
  gameId: string;
  data: Record<string, unknown>;
}

export type DefaultGamePayload = JoinPayload | EndRoundPayload | PersistentDataPayload;
export type GameMessage<TFeaturePayload extends { action: string }> =
  | DefaultGamePayload
  | TFeaturePayload;

export interface RoundAction {
  action: string;
  requestId: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
}

export interface ActiveRound {
  roundId: string;
  userId: string;
  roomId: string;
  status: 'ACTIVE';
  spinCount: number;
  lastSpinId: number;
  history: RoundAction[];
}

export interface GamePlayerData {
  userId: string;
  gameId: string;
  data: Record<string, unknown>;
}

export interface GamePlayerDataStore {
  save(payload: GamePlayerData): Promise<void>;
}

export interface CurrentRoundStore {
  get(userId: string, roomId: string): Promise<ActiveRound | null>;
  getOrCreate(userId: string, roomId: string): Promise<ActiveRound>;
  recordSpin(round: ActiveRound, spinId: number): Promise<ActiveRound>;
  restore(round: ActiveRound): Promise<void>;
  recordAction(round: ActiveRound, action: Omit<RoundAction, 'createdAt'>): Promise<ActiveRound>;
  clear(userId: string, roomId: string): Promise<void>;
}

export interface RoundStore {
  findActive(userId: string, roomId: string): Promise<ActiveRound | null>;
  saveStarted(round: ActiveRound): Promise<void>;
  complete(round: ActiveRound): Promise<void>;
}

export interface RoundActionStore {
  save(params: {
    roundId: string;
    userId: string;
    roomId: string;
    action: string;
    requestId: string;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
  }): Promise<void>;
  listForRound(roundId: string): Promise<RoundAction[]>;
}

export interface RoomMembershipStore {
  exists(userId: string, roomId: string): Promise<boolean>;
}

export interface PlayerJoinedPublisher {
  playerJoined(ws: GameSocket, data: { requestId?: string | null }): Promise<void>;
  playerAction(
    ws: GameSocket,
    action: string,
    data: Record<string, unknown> & {
      requestId?: string | null;
      serverId?: string;
      timestamp?: string;
    }
  ): Promise<void>;
}

export interface TokenVerifier {
  playerId(token: string): string;
}

export interface RoomStateProvider {
  key: string;
  state(userId: string, roomId: string): Promise<unknown>;
}

export interface WalletService {
  deduct(request: {
    userId: string;
    amount: number;
    transactionId: string;
    gameId: string;
    referenceId?: string;
  }): Promise<{
    userId: string;
    balance: number;
    jackpotContributions?: {
      jackpotName: string;
      amount: number;
      currentAmount: number;
    }[];
  }>;
  credit(request: {
    userId: string;
    amount: number;
    transactionId: string;
    referenceId?: string;
  }): Promise<{
    userId: string;
    balance: number;
  }>;
}

export interface GameRuntimeContext<TEvent = unknown> {
  rounds: {
    activeOrCreate(userId: string, roomId: string): Promise<ActiveRound>;
    recordSpin(round: ActiveRound, spinId: number): Promise<ActiveRound>;
    recordActionIfActive(
      userId: string,
      roomId: string,
      action: Omit<RoundAction, 'createdAt'>
    ): Promise<void>;
    history(userId: string, roomId: string): Promise<RoundAction[]>;
    endRound(request: { userId: string; roomId: string; requestId: string }): Promise<object>;
  };
  gameEvents: {
    publish(eventKey: string, eventType: string, payload: object): Promise<void>;
    actionCompleted(action: string, payload: object, eventKey: string): Promise<void>;
  };
  roomEvents: PlayerJoinedPublisher;
  wallet: WalletService;
  logger: RequestLogger & { redisPublishFailed?(trace: RequestTrace | object, error: Error): void };
}

export interface GameFeature<TPayload extends { action: string } = any> {
  handlers: Record<string, GameActionHandler<any>>;
  roomStateProviders?: RoomStateProvider[];
  idempotencyKey?: (
    ws: GameSocket,
    payload: TPayload
  ) => Promise<string | null | undefined> | string | null | undefined;
  hasConflict?: (payload: TPayload, response?: object) => boolean;
}

export interface GameActionContext {
  gamePlayerDataService: {
    save(request: {
      userId: string;
      requestId: string;
      gameId: string;
      data: Record<string, unknown>;
    }): Promise<object>;
  };
  publisher: PlayerJoinedPublisher;
  idempotencyRepository: {
    reserve(key: string): Promise<boolean>;
    get(key: string): Promise<{ status: 'pending' | 'completed'; response?: object } | null>;
    complete(key: string, response: object): Promise<void>;
    release(key: string): Promise<void>;
  };
  roomMembershipRepository: RoomMembershipStore;
  roundService: {
    endRound(request: { userId: string; roomId: string; requestId: string }): Promise<object>;
    history(userId: string, roomId: string): Promise<RoundAction[]>;
    recordActionIfActive(
      userId: string,
      roomId: string,
      action: Omit<RoundAction, 'createdAt'>
    ): Promise<void>;
  };
  roomStateProviders: RoomStateProvider[];
  logger: RequestLogger & { redisPublishFailed?(trace: RequestTrace, error: Error): void };
  responder: ResponseSender;
}

export type { RequestTrace };
