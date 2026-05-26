import AppError from '../../errors/AppError';
import { IncomingMessagePayload, GameSocket } from '../../types/websocket';
import { ActionContext, remember, RequestTrace } from './types';

const symbols = ['CHERRY', 'LEMON', 'BELL', 'SEVEN'];

export async function spinAction(
  ws: GameSocket,
  payload: IncomingMessagePayload,
  context: ActionContext,
  trace: RequestTrace,
  startedAt: number,
  idempotencyKey: string | null
): Promise<void> {
  const { requestId, spinId, betAmount } = payload;

  if (!requestId) {
    context.logger.failed(trace, startedAt, 'requestId required');
    context.responder.error(ws, 'requestId required');
    return;
  }

  if (!ws.userId || !ws.roomId) {
    context.logger.failed(trace, startedAt, 'join required');
    context.responder.error(ws, 'join required', requestId);
    return;
  }

  if (!spinId || typeof betAmount !== 'number' || betAmount <= 0) {
    context.logger.failed(trace, startedAt, 'spinId and positive betAmount required');
    context.responder.error(ws, 'spinId and positive betAmount required', requestId);
    return;
  }

  if (idempotencyKey && !await context.idempotencyStore.reserve(idempotencyKey)) {
    context.logger.duplicatePending(trace, startedAt);
    context.responder.pending(ws, requestId);
    return;
  }

  ws.pendingRequests.add(idempotencyKey || requestId);

  try {
    const debit = await context.adjustWallet(ws.userId, -betAmount);
    const result = spin(betAmount);
    let balance = debit.balance;

    if (result.winAmount > 0) {
      const credit = await context.adjustWallet(ws.userId, result.winAmount);
      balance = credit.balance;
    }

    const response = {
      status: 'ok',
      action: 'spin',
      requestId,
      spinId,
      betAmount,
      symbols: result.symbols,
      winAmount: result.winAmount,
      balance
    };

    await context.spinStore.saveCompletedSpin({
      userId: ws.userId,
      roomId: ws.roomId,
      requestId,
      spinId,
      betAmount,
      winAmount: result.winAmount,
      symbols: result.symbols,
      balance
    });

    await remember(ws, idempotencyKey, response, context.idempotencyStore);
    context.responder.ok(ws, {
      action: 'spin',
      requestId,
      spinId,
      betAmount,
      symbols: result.symbols,
      winAmount: result.winAmount,
      balance
    });
    context.logger.completed({ ...trace, spinId, betAmount }, startedAt);

    context.publisher.spinCompleted(ws, {
      spinId,
      betAmount,
      winAmount: result.winAmount,
      symbols: result.symbols,
      balance,
      requestId
    }).catch((publishErr) => {
      console.error('spin notification publish failed', (publishErr as Error).message);
    });
  } catch (err) {
    if (idempotencyKey) {
      await context.idempotencyStore.release(idempotencyKey);
    }

    const appErr = new AppError((err as Error).message);
    context.logger.failed(trace, startedAt, appErr.message, {
      status: appErr.status,
      source: appErr.source,
      detail: appErr.detail
    });
    context.responder.error(ws, appErr.message, requestId, appErr.detail);
  } finally {
    ws.pendingRequests.delete(idempotencyKey || requestId);
  }
}

function spin(betAmount: number): { symbols: string[]; winAmount: number } {
  const result = [randomSymbol(), randomSymbol(), randomSymbol()];

  return {
    symbols: result,
    winAmount: calculateWin(result, betAmount)
  };
}

function randomSymbol(): string {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function calculateWin(result: string[], betAmount: number): number {
  const uniqueSymbols = new Set(result).size;

  if (uniqueSymbols === 1) {
    return betAmount * 5;
  }

  if (uniqueSymbols === 2) {
    return betAmount * 2;
  }

  return 0;
}
