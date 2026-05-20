export interface WalletAdjustResponse {
  userId: string;
  balance: number;
}

export interface WalletError extends Error {
  detail?: unknown;
}
