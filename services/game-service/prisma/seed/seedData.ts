export const seedContext = {
  userId: '100001',
  roomId: 'seed-room-1',
  gameId: 'slot-1',
  activeRoundId: 'seed-active-round-1',
  completedRoundId: 'seed-completed-round-1'
};

export interface SeedRound {
  roundId: string;
  userId: string;
  roomId: string;
  status: 'ACTIVE' | 'DONE';
  completedAt?: Date | null;
}

export interface SeedSpin {
  userId: string;
  roomId: string;
  roundId: string;
  gameId: string;
  requestId: string;
  spinId: string;
  betAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  winAmount: number;
  symbols: string[];
  balance: number;
  completedAt?: Date | null;
}

export interface SeedRoundAction {
  userId: string;
  roomId: string;
  roundId: string;
  action: string;
  requestId: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
}

const {
  userId,
  roomId,
  gameId,
  activeRoundId,
  completedRoundId
} = seedContext;

export const seedRounds: SeedRound[] = [
  {
    roundId: activeRoundId,
    userId,
    roomId,
    status: 'ACTIVE',
    completedAt: null
  },
  {
    roundId: completedRoundId,
    userId,
    roomId,
    status: 'DONE',
    completedAt: new Date()
  }
];

export const seedSpins: SeedSpin[] = [
  {
    userId,
    roomId,
    roundId: activeRoundId,
    gameId,
    requestId: 'seed-active-spin-1',
    spinId: '1',
    betAmount: 10,
    status: 'COMPLETED',
    winAmount: 20,
    symbols: ['CHERRY', 'CHERRY', 'LEMON'],
    balance: 100010,
    completedAt: new Date()
  },
  {
    userId,
    roomId,
    roundId: completedRoundId,
    gameId,
    requestId: 'seed-completed-spin-1',
    spinId: '1',
    betAmount: 10,
    status: 'COMPLETED',
    winAmount: 0,
    symbols: ['CHERRY', 'LEMON', 'BELL'],
    balance: 99990,
    completedAt: new Date()
  },
  {
    userId,
    roomId,
    roundId: completedRoundId,
    gameId,
    requestId: 'seed-completed-spin-2',
    spinId: '2',
    betAmount: 10,
    status: 'COMPLETED',
    winAmount: 50,
    symbols: ['SEVEN', 'SEVEN', 'SEVEN'],
    balance: 100040,
    completedAt: new Date()
  }
];

export const seedRoundActions: SeedRoundAction[] = [
  {
    userId,
    roomId,
    roundId: activeRoundId,
    action: 'spin',
    requestId: 'seed-active-spin-1',
    payload: {
      gameId,
      spinId: '1',
      betAmount: 10
    },
    result: {
      roundId: activeRoundId,
      symbols: ['CHERRY', 'CHERRY', 'LEMON'],
      winAmount: 20,
      balance: 100010
    }
  },
  {
    userId,
    roomId,
    roundId: activeRoundId,
    action: 'persistent_data',
    requestId: 'seed-data-1',
    payload: {
      gameId,
      data: {
        freeSpinsLeft: 3,
        bonusMultiplier: 2
      }
    },
    result: {
      saved: true
    }
  }
];
