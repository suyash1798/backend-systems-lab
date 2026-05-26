import { PrismaClient } from '@prisma/client';
import { CompletedSpin } from './models/Spin';

class SpinStore {
  constructor(private readonly prisma: PrismaClient) {}

  async saveCompletedSpin(spin: CompletedSpin): Promise<void> {
    await this.prisma.gameSpin.createMany({
      data: {
        userId: spin.userId,
        roomId: spin.roomId,
        requestId: spin.requestId,
        spinId: spin.spinId,
        betAmount: spin.betAmount,
        winAmount: spin.winAmount,
        symbols: spin.symbols,
        balance: spin.balance
      },
      skipDuplicates: true
    });
  }
}

export default SpinStore;
