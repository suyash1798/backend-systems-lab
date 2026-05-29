import { PrismaClient } from '@prisma/client';

class RoomMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async exists(userId: string, roomId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ exists: boolean }[]>`
      select exists (
        select 1
        from game_room_players p
        join game_rooms r on r.room_id = p.room_id
        where p.user_id = ${userId}
          and p.room_id = ${roomId}
          and r.status in ('OPEN', 'FULL')
      ) as "exists"
    `;

    return rows[0]?.exists === true;
  }
}

export default RoomMembershipRepository;
