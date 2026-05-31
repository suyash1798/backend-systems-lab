import { PrismaClient } from '@prisma/client';
import { ActiveRound } from '../game/models/Round';

class RoundRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive(userId: string, roomId: string): Promise<ActiveRound | null> {
    const rows = await this.prisma.$queryRaw<Array<{
      roundId: string;
      userId: string;
      roomId: string;
      spinCount: bigint;
      lastSpinId: number;
    }>>`
      select
        r.round_id as "roundId",
        r.user_id as "userId",
        r.room_id as "roomId",
        count(s.id) as "spinCount",
        coalesce(max((s.spin_id)::int), 0) as "lastSpinId"
      from game_rounds r
      left join game_spins s on s.round_id = r.round_id
      where r.user_id = ${userId}
        and r.room_id = ${roomId}
        and r.status = 'ACTIVE'
      group by r.round_id, r.user_id, r.room_id
      order by r.created_at desc
      limit 1
    `;

    const round = rows[0];

    if (!round) {
      return null;
    }

    return {
      roundId: round.roundId,
      userId: round.userId,
      roomId: round.roomId,
      status: 'ACTIVE',
      spinCount: Number(round.spinCount),
      lastSpinId: Number(round.lastSpinId),
      history: []
    };
  }

  async saveStarted(round: ActiveRound): Promise<void> {
    await this.prisma.gameRound.upsert({
      where: { roundId: round.roundId },
      update: {},
      create: {
        roundId: round.roundId,
        userId: round.userId,
        roomId: round.roomId,
        status: 'ACTIVE'
      }
    });
  }

  async complete(round: ActiveRound): Promise<void> {
    await this.prisma.gameRound.update({
      where: { roundId: round.roundId },
      data: {
        status: 'DONE',
        completedAt: new Date()
      }
    });
  }
}

export default RoundRepository;
