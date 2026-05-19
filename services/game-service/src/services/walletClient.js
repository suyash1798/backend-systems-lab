const fetch = require('node-fetch');

class WalletClient {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl;
  }

  async playForUser(userId) {
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
      const err = new Error('wallet service error');
      err.detail = detail;
      throw err;
    }

    return resp.json();
  }
}

module.exports = WalletClient;
