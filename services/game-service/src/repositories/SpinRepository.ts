import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { CompletedSpin } from '../game/models/Spin';

class SpinRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findCompletedByUserRoundAndSpinId(
    userId: string,
    roundId: string,
    spinId: string
  ): Promise<CompletedSpin | null> {
    const spin = await this.prisma.gameSpin.findUnique({
      where: {
        userId_roundId_spinId: {
          userId,
          roundId,
          spinId
        }
      }
    });

    if (!spin) {
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

  async saveCompletedSpin(spin: CompletedSpin): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.gameSpin.createMany({
        data: {
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
        },
        skipDuplicates: true
      });

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
}

export default SpinRepository;
