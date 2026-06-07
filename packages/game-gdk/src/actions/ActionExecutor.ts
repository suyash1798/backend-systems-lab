import {
  GameActionHandler,
  GameSocket,
  IdempotencyStore,
  IncomingMessagePayload,
  RequestLogger,
  RequestTrace,
  ResponseSender
} from '../types';

interface ExecuteOptions<TPayload extends IncomingMessagePayload> {
  ws: GameSocket;
  payload: TPayload;
  trace: RequestTrace;
  startedAt: number;
  duplicateKey: string | null;
  handler: GameActionHandler<TPayload>;
  onDuplicateResponse?: (response: object) => void;
}

interface ActionExecutorContext {
  idempotencyRepository: IdempotencyStore;
  logger: RequestLogger;
  responder: ResponseSender;
}

class ActionExecutor {
  constructor(private readonly context: ActionExecutorContext) {}

  async execute<TPayload extends IncomingMessagePayload>({
    ws,
    payload,
    trace,
    startedAt,
    duplicateKey,
    handler,
    onDuplicateResponse
  }: ExecuteOptions<TPayload>): Promise<void> {
    const duplicateHandled = await this.handleDuplicate({
      ws,
      payload,
      trace,
      startedAt,
      duplicateKey,
      onDuplicateResponse
    });

    if (duplicateHandled) {
      return;
    }

    if (duplicateKey && !await this.context.idempotencyRepository.reserve(duplicateKey)) {
      this.context.logger.duplicatePending(trace, startedAt);
      this.context.responder.pending(ws, payload.requestId);
      return;
    }

    if (duplicateKey) {
      ws.pendingRequests.add(duplicateKey);
    }

    this.context.logger.started(trace);

    try {
      const response = await handler.handle(ws, payload);

      await this.remember(ws, duplicateKey, response);
      this.context.responder.ok(ws, response);
      this.context.logger.completed(trace, startedAt);

      await this.onSuccess(handler, ws, payload, response, trace);
    } catch (err) {
      await this.release(duplicateKey);
      this.fail(ws, payload, trace, startedAt, err);
    } finally {
      if (duplicateKey) {
        ws.pendingRequests.delete(duplicateKey);
      }
    }
  }

  private async handleDuplicate<TPayload extends IncomingMessagePayload>({
    ws,
    payload,
    trace,
    startedAt,
    duplicateKey,
    onDuplicateResponse
  }: Omit<ExecuteOptions<TPayload>, 'handler'>): Promise<boolean> {
    if (!duplicateKey) {
      return false;
    }

    if (ws.processedRequests.has(duplicateKey)) {
      this.sendDuplicate(ws, trace, startedAt, ws.processedRequests.get(duplicateKey) || {}, onDuplicateResponse);
      return true;
    }

    if (ws.pendingRequests.has(duplicateKey)) {
      this.context.logger.duplicatePending(trace, startedAt);
      this.context.responder.pending(ws, payload.requestId);
      return true;
    }

    const stored = await this.context.idempotencyRepository.get(duplicateKey);

    if (stored?.status === 'completed') {
      this.sendDuplicate(ws, trace, startedAt, stored.response || {}, onDuplicateResponse);
      return true;
    }

    if (stored?.status === 'pending') {
      this.context.logger.duplicatePending(trace, startedAt);
      this.context.responder.pending(ws, payload.requestId);
      return true;
    }

    return false;
  }

  private sendDuplicate(
    ws: GameSocket,
    trace: RequestTrace,
    startedAt: number,
    response: object,
    onDuplicateResponse?: (response: object) => void
  ): void {
    this.context.logger.duplicateCompleted(trace, startedAt);
    onDuplicateResponse?.(response);
    this.context.responder.duplicate(ws, response);
  }

  private async remember(
    ws: GameSocket,
    key: string | null,
    response: object
  ): Promise<void> {
    if (!key) {
      return;
    }

    ws.processedRequests.set(key, response);
    await this.context.idempotencyRepository.complete(key, response);
  }

  private async release(key: string | null): Promise<void> {
    if (!key) {
      return;
    }

    await this.context.idempotencyRepository.release(key);
  }

  private async onSuccess<TPayload extends IncomingMessagePayload>(
    handler: GameActionHandler<TPayload>,
    ws: GameSocket,
    payload: TPayload,
    response: object,
    trace: RequestTrace
  ): Promise<void> {
    try {
      await handler.onSuccess?.(ws, payload, response, trace);
    } catch (err) {
      console.error('action success side effect failed', (err as Error).message);
    }
  }

  private fail(
    ws: GameSocket,
    payload: IncomingMessagePayload,
    trace: RequestTrace,
    startedAt: number,
    err: unknown
  ): void {
    const error = err as { message?: string; status?: number; source?: string; detail?: unknown };
    const message = error.message || 'request failed';

    this.context.logger.failed(trace, startedAt, message, {
      status: error.status || 500,
      source: error.source,
      detail: error.detail
    });
    this.context.responder.error(ws, message, payload.requestId, error.detail);
  }
}

export default ActionExecutor;
