import fetch from 'node-fetch';
import { WalletAdjustResponse, WalletError } from '../types/wallet';

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
      const detail = await resp.json().catch(() => ({ error: 'wallet error' }));
      const err = new Error('wallet service error') as WalletError;
      err.detail = detail;
      err.status = resp.status;
      err.url = url;
      throw err;
    }

    return resp.json() as Promise<WalletAdjustResponse>;
  }
}

export default WalletClient;
