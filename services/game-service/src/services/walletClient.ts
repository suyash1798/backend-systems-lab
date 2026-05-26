import fetch from 'node-fetch';
import AppError from '../errors/AppError';
import { WalletAdjustResponse } from '../types/wallet';

class WalletClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string ) {
    this.baseUrl = baseUrl;
  }

  async adjustBalance(userId: string, amount: number): Promise<WalletAdjustResponse> {
    if (!userId) {
      throw new Error('userId required');
    }

    const url = `${this.baseUrl}/adjust`;
    const resp = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ userId, amount }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!resp.ok) {
      const detail = await resp.json().catch(() => null);
      throw new AppError('wallet service error', resp.status, { url, detail }, 'wallet-service');
    }

    return resp.json() as Promise<WalletAdjustResponse>;
  }
}

export default WalletClient;
