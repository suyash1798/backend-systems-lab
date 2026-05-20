import fetch from 'node-fetch';
import { WalletAdjustResponse, WalletError } from '../types/wallet';

class WalletClient {
  private readonly baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl;
  }

  async playForUser(userId: string): Promise<WalletAdjustResponse> {
    if (!userId) {
      throw new Error('userId required');
    }

    const resp = await fetch(`${this.baseUrl}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ userId, amount: -10 }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!resp.ok) {
      const detail = await resp.json().catch(() => ({ error: 'wallet error' }));
      const err = new Error('wallet service error') as WalletError;
      err.detail = detail;
      throw err;
    }

    return resp.json() as Promise<WalletAdjustResponse>;
  }
}

export default WalletClient;
