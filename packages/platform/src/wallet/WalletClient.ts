import AppError from '../errors/AppError';
import { WalletCreditRequest, WalletDeductRequest, WalletResponse } from './types';

class WalletClient {
  constructor(private readonly baseUrl: string) {}

  async deduct(request: WalletDeductRequest): Promise<WalletResponse> {
    const { userId, amount, transactionId, gameId, referenceId } = request;

    return this.post('/deduct', {
      userId,
      amount,
      transactionId,
      gameId,
      referenceId
    });
  }

  async credit(request: WalletCreditRequest): Promise<WalletResponse> {
    const { userId, amount, transactionId, referenceId } = request;

    return this.post('/credit', {
      userId,
      amount,
      transactionId,
      referenceId
    });
  }

  private async post(path: string, payload: object): Promise<WalletResponse> {
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!resp.ok) {
      const detail = await resp.json().catch(() => null);
      throw new AppError('wallet service error', resp.status, { url, detail }, 'wallet-service');
    }

    return resp.json() as Promise<WalletResponse>;
  }
}

export default WalletClient;
