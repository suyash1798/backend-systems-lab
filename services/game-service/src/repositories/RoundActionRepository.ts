import { PrismaClient } from '@prisma/client';
import { RoundAction } from '../game/models/Round';

class RoundActionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save({
    roundId,
    userId,
    roomId,
    action,
    requestId,
    payload,
    result
  }: {
    roundId: string;
    userId: string;
    roomId: string;
    action: string;
    requestId: string;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      insert into round_actions (
        round_id,
        user_id,
        room_id,
        action,
        request_id,
        payload,
        result
      )
      values (
        ${roundId},
        ${userId},
        ${roomId},
        ${action},
        ${requestId},
        ${JSON.stringify(payload)}::jsonb,
        ${result ? JSON.stringify(result) : null}::jsonb
      )
      on conflict (round_id, action, request_id) do nothing
    `;
  }

  async listForRound(roundId: string): Promise<RoundAction[]> {
    const actions = await this.prisma.$queryRaw<Array<{
      action: string;
      requestId: string;
      payload: Record<string, unknown>;
      result: Record<string, unknown> | null;
      createdAt: Date;
    }>>`
      select
        action,
        request_id as "requestId",
        payload,
        result,
        created_at as "createdAt"
      from round_actions
      where round_id = ${roundId}
      order by id
    `;

    return actions.map((action) => ({
      action: action.action,
      requestId: action.requestId,
      payload: action.payload,
      result: action.result || undefined,
      createdAt: action.createdAt.toISOString()
    }));
  }
}

export default RoundActionRepository;
