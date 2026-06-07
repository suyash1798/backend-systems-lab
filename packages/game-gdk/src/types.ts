import { WebSocket } from 'ws';

export interface GameSocket extends WebSocket {
  id: string;
  isAlive: boolean;
  roomId: string | null;
  userId: string | null;
  processedRequests: Map<string, object>;
  pendingRequests: Set<string>;
}

export interface IncomingMessagePayload {
  action: string;
  requestId?: string | null;
}

export interface RoomEvent {
  roomId: string;
  sourceConnectionId: string;
  [key: string]: unknown;
}

export interface GameEvent extends RoomEvent {
  [key: string]: unknown;
  type: string;
  userId: string;
  requestId?: string | null;
  serverId?: string;
  timestamp?: string;
}

export interface PlayerJoinedEvent extends GameEvent {
  type: 'player_joined';
}

export interface PlayerActionEvent extends GameEvent {
  type: 'player_action';
  action: string;
}

export type GameEventMessage<TFeatureEvent extends PlayerActionEvent> =
  | PlayerJoinedEvent
  | TFeatureEvent;

export interface RequestTrace {
  action: string;
  requestId?: string | null;
  duplicateKey?: string | null;
  connectionId: string;
  userId?: string | null;
  roomId?: string | null;
  [key: string]: unknown;
}

export interface StoredIdempotencyRequest {
  status: 'pending' | 'completed';
  response?: object;
}

export interface IdempotencyStore {
  reserve(key: string): Promise<boolean>;
  get(key: string): Promise<StoredIdempotencyRequest | null>;
  complete(key: string, response: object): Promise<void>;
  release(key: string): Promise<void>;
}

export interface RequestLogger {
  started(trace: RequestTrace): void;
  completed(trace: RequestTrace, startedAt: number): void;
  failed(trace: RequestTrace, startedAt: number, error: string, detail?: unknown): void;
  duplicateCompleted(trace: RequestTrace, startedAt: number): void;
  duplicatePending(trace: RequestTrace, startedAt: number): void;
}

export interface ResponseSender {
  ok(ws: GameSocket, payload: object): void;
  error(ws: GameSocket, error: string, requestId?: string | null, detail?: unknown): void;
  pending(ws: GameSocket, requestId?: string | null): void;
  duplicate(ws: GameSocket, response: object): void;
}

export interface GameActionHandler<TPayload extends IncomingMessagePayload> {
  duplicateKey?(
    ws: GameSocket,
    payload: TPayload
  ): Promise<string | null | undefined> | string | null | undefined;
  handle(ws: GameSocket, payload: TPayload): Promise<object>;
  onSuccess?(
    ws: GameSocket,
    payload: TPayload,
    response: object,
    trace: RequestTrace
  ): Promise<void>;
}

export interface MessageRouter<TPayload extends IncomingMessagePayload> {
  handle(ws: GameSocket, payload: TPayload): Promise<void>;
}

export type ValidateMessage<TPayload extends IncomingMessagePayload> = (
  payload: unknown
) => TPayload;
