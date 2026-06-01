import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { CompletedSpin, PendingSpin, SpinIntent } from '../game/models/Spin';

class SpinRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findCompletedByRoundAndSpinId(
    roundId: string,
    spinId: string
  ): Promise<CompletedSpin | null> {
    const rows = await this.prisma.$queryRaw<Array<{
      userId: string;
      roomId: string;
      roundId: string;
      gameId: string;
      requestId: string;
      spinId: string;
      betAmount: number;
      winAmount: number | null;
      symbols: unknown;
      balance: number | null;
    }>>`
      select
        user_id as "userId",
        room_id as "roomId",
        round_id as "roundId",
        game_id as "gameId",
        request_id as "requestId",
        spin_id as "spinId",
        bet_amount as "betAmount",
        win_amount as "winAmount",
        symbols,
        balance
      from game_spins
      where round_id = ${roundId}
        and spin_id = ${spinId}
        and status = 'COMPLETED'
      limit 1
    `;
    const spin = rows[0];

    if (!spin || spin.winAmount === null || spin.symbols === null || spin.balance === null) {
      return null;
    }

    return {
      userId: spin.userId,
      roomId: spin.roomId,
      roundId: spin.roundId,
      gameId: spin.gameId,
      requestId: spin.requestId,
      spinId: spin.spinId,
      betAmount: spin.betAmount,
      winAmount: spin.winAmount,
      symbols: spin.symbols as string[],
      balance: spin.balance
    };
  }

  async createPendingSpin(spin: SpinIntent): Promise<PendingSpin> {
    const inserted = await this.prisma.$queryRaw<Array<{ id: bigint }>>`
      insert into game_spins (
        user_id,
        room_id,
        round_id,
        game_id,
        request_id,
        spin_id,
        bet_amount,
        status
      )
      values (
        ${spin.userId},
        ${spin.roomId},
        ${spin.roundId},
        ${spin.gameId},
        ${spin.requestId},
        ${spin.spinId},
        ${spin.betAmount},
        'PENDING'
      )
      on conflict (round_id, spin_id) do nothing
      returning id
    `;

    const created = inserted.length > 0;
    const id = inserted[0]?.id || await this.findSpinId(spin.roundId, spin.spinId);

    return {
      id,
      userId: spin.userId,
      roomId: spin.roomId,
      roundId: spin.roundId,
      gameId: spin.gameId,
      requestId: spin.requestId,
      spinId: spin.spinId,
      betAmount: spin.betAmount,
      created
    };
  }

  async markFailed(id: bigint): Promise<void> {
    await this.prisma.$executeRaw`
      update game_spins
      set status = 'FAILED',
          failed_at = now()
      where id = ${id}
    `;
  }

  async completeSpin(id: bigint, spin: CompletedSpin): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        update game_spins
        set status = 'COMPLETED',
            win_amount = ${spin.winAmount},
            symbols = ${JSON.stringify(spin.symbols)}::jsonb,
            balance = ${spin.balance},
            completed_at = now()
        where id = ${id}
      `;

      await tx.outboxEvent.createMany({
        data: {
          id: randomUUID(),
          eventKey: `spin_completed:${spin.userId}:${spin.roundId}:${spin.spinId}`,
          eventType: 'spin_completed',
          payload: {
            userId: spin.userId,
            roomId: spin.roomId,
            roundId: spin.roundId,
            gameId: spin.gameId,
            requestId: spin.requestId,
            spinId: spin.spinId,
            betAmount: spin.betAmount,
            winAmount: spin.winAmount,
            symbols: spin.symbols,
            balance: spin.balance
          }
        },
        skipDuplicates: true
      });

      await tx.$executeRaw`
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
          ${spin.roundId},
          ${spin.userId},
          ${spin.roomId},
          'spin',
          ${spin.requestId},
          ${JSON.stringify({
            gameId: spin.gameId,
            spinId: spin.spinId,
            betAmount: spin.betAmount
          })}::jsonb,
          ${JSON.stringify({
            roundId: spin.roundId,
            symbols: spin.symbols,
            winAmount: spin.winAmount,
            balance: spin.balance
          })}::jsonb
        )
        on conflict (round_id, action, request_id) do nothing
      `;
    });
  }

  private async findSpinId(roundId: string, spinId: string): Promise<bigint> {
    const rows = await this.prisma.$queryRaw<Array<{ id: bigint }>>`
      select id
      from game_spins
      where round_id = ${roundId}
        and spin_id = ${spinId}
      limit 1
    `;

    if (!rows[0]) {
      throw new Error('spin not found');
    }

    return rows[0].id;
  }
}

export default SpinRepository;
