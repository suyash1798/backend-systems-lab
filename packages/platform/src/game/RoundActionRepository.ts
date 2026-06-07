import { PrismaClient } from '@trying-sd/game-db';
import { RoundAction } from '@trying-sd/game-gdk';

interface RoundActionRow {
  action: string;
  requestId: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  createdAt: Date;
}

interface SaveRoundActionParams {
  roundId: string;
  userId: string;
  roomId: string;
  action: string;
  requestId: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
}

class RoundActionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(params: SaveRoundActionParams): Promise<void> {
    const {
      roundId,
      userId,
      roomId,
      action,
      requestId,
      payload,
      result
    } = params;

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
    const actions = await this.prisma.$queryRaw`
      select
        action,
        request_id as "requestId",
        payload,
        result,
        created_at as "createdAt"
      from round_actions
      where round_id = ${roundId}
      order by id
    ` as RoundActionRow[];

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
