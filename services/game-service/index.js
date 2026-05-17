const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const GameSocketServer = require('./GameSocketServer');

const app = express();
app.use(bodyParser.json());

const walletUrl = process.env.WALLET_URL || 'http://wallet-service:4000';

// Simple endpoint to 'play' which charges the user 10 units
async function playForUser(userId) {
  if (!userId) throw new Error('userId required');
  const resp = await fetch(`${walletUrl}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ userId, amount: -10 }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'wallet error' }));
    const e = new Error('wallet service error');
    e.detail = err;
    throw e;
  }
  return resp.json();
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'game-service' });
});

app.post('/play', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const data = await playForUser(userId);
    res.json({ result: 'played', balance: data.balance });
  } catch (err) {
    res.status(502).json({ error: err.message, detail: err.detail || null });
  }
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`game-service listening on ${port}`));

const HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_INTERVAL_MS) || 30000;

const gameSocketServer = new GameSocketServer({
  server,
  heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
  playHandler: playForUser
});

gameSocketServer.start();
