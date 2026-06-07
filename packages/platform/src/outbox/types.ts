export interface OutboxEventRecord {
  id: string;
  eventType: string;
  payload: object;
}

export type OutboxStats = Record<string, number>;

export interface OutboxStore {
  create(eventKey: string, eventType: string, payload: object): Promise<void>;
  claimPending(limit: number): Promise<OutboxEventRecord[]>;
  markPublished(id: string): Promise<void>;
  markPending(id: string): Promise<void>;
  stats(): Promise<OutboxStats>;
}

export interface EventProducer {
  publish(type: string, payload: object): Promise<boolean>;
}
