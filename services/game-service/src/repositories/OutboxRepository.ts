import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

export interface OutboxEventRecord {
  id: string;
  eventType: string;
  payload: object;
}

export type OutboxStats = Record<string, number>;

class OutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(eventKey: string, eventType: string, payload: object): Promise<void> {
    await this.prisma.outboxEvent.createMany({
      data: {
        id: randomUUID(),
        eventKey,
        eventType,
        payload: JSON.parse(JSON.stringify(payload))
      },
      skipDuplicates: true
    });
  }

  async claimPending(limit: number): Promise<OutboxEventRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw<OutboxEventRecord[]>`
        select id, event_type as "eventType", payload
        from outbox_events
        where status = 'pending'
        order by created_at
        limit ${limit}
        for update skip locked
      `;

      for (const event of events) {
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'publishing',
            attempts: { increment: 1 }
          }
        });
      }

      return events;
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date()
      }
    });
  }

  async markPending(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'pending' }
    });
  }

  async stats(): Promise<OutboxStats> {
    const rows = await this.prisma.outboxEvent.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    return rows.reduce<OutboxStats>((stats, row) => {
      stats[row.status] = row._count._all;
      return stats;
    }, {
      pending: 0,
      publishing: 0,
      published: 0
    });
  }
}

export default OutboxRepository;
