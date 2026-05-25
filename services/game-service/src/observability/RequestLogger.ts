import { log } from './logger';

type RequestTrace = {
  action: string;
  requestId?: string | null;
  connectionId: string;
  userId?: string | null;
  roomId?: string | null;
};

class RequestLogger {
  started(trace: RequestTrace): void {
    log('request_started', trace);
  }

  completed(trace: RequestTrace, startedAt: number): void {
    this.finished('request_completed', trace, startedAt);
  }

  failed(trace: RequestTrace, startedAt: number, error: string, detail?: unknown): void {
    this.finished('request_failed', trace, startedAt, error, detail);
  }

  duplicateCompleted(trace: RequestTrace, startedAt: number): void {
    this.finished('request_duplicate_completed', trace, startedAt);
  }

  duplicatePending(trace: RequestTrace, startedAt: number): void {
    this.finished('request_duplicate_pending', trace, startedAt);
  }

  redisPublishFailed(trace: RequestTrace, error: Error): void {
    log('redis_publish_failed', {
      ...trace,
      error: error.message
    });
  }

  private finished(event: string, trace: RequestTrace, startedAt: number, error?: string, detail?: unknown): void {
    log(event, {
      ...trace,
      latencyMs: Date.now() - startedAt,
      error,
      detail
    });
  }
}

export default RequestLogger;
