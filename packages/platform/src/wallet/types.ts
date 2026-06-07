export interface WalletDeductRequest {
  userId: string;
  amount: number;
  transactionId: string;
  gameId: string;
  referenceId?: string;
}

export interface WalletCreditRequest {
  userId: string;
  amount: number;
  transactionId: string;
  referenceId?: string;
}

export interface WalletResponse {
  userId: string;
  balance: number;
  jackpotContributions?: {
    jackpotName: string;
    amount: number;
    currentAmount: number;
  }[];
}
