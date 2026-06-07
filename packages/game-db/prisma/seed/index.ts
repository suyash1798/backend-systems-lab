import { PrismaClient } from '@prisma/client';
import {
  SeedRoundAction,
  seedRoundActions,
  seedRounds,
  seedSpins
} from './seedData';

class SlotServiceSeeder {
  constructor(private readonly prisma: PrismaClient) {}

  async run(): Promise<void> {
    await this.seedRounds();
    await this.seedSpins();
    await this.seedRoundActions();

    console.log('Seeded slot-service demo data');
  }

  private async seedRounds(): Promise<void> {
    for (const round of seedRounds) {
      await this.prisma.gameRound.upsert({
        where: { roundId: round.roundId },
        update: {
          status: round.status,
          completedAt: round.completedAt ?? null
        },
        create: {
          roundId: round.roundId,
          userId: round.userId,
          roomId: round.roomId,
          status: round.status,
          completedAt: round.completedAt ?? null
        }
      });
    }
  }

  private async seedSpins(): Promise<void> {
    for (const spin of seedSpins) {
      await this.prisma.$executeRaw`
        insert into game_spins (
          user_id,
          room_id,
          round_id,
          game_id,
          request_id,
          spin_id,
          bet_amount,
          status,
          win_amount,
          symbols,
          balance,
          completed_at
        )
        values (
          ${spin.userId},
          ${spin.roomId},
          ${spin.roundId},
          ${spin.gameId},
          ${spin.requestId},
          ${spin.spinId},
          ${spin.betAmount},
          ${spin.status},
          ${spin.winAmount},
          ${JSON.stringify(spin.symbols)}::jsonb,
          ${spin.balance},
          ${spin.completedAt || null}
        )
        on conflict (round_id, spin_id) do nothing
      `;
    }
  }

  private async seedRoundActions(): Promise<void> {
    for (const action of seedRoundActions) {
      await this.saveRoundAction(action);
    }
  }

  private async saveRoundAction(seedAction: SeedRoundAction): Promise<void> {
    const { userId, roomId, roundId, action, requestId, payload, result } = seedAction;

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
        ${JSON.stringify(result)}::jsonb
      )
      on conflict (round_id, action, request_id) do nothing
    `;
  }
}

const prisma = new PrismaClient();

const seeder = new SlotServiceSeeder(prisma);

seeder.run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
