const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const app = express();
app.use(bodyParser.json());

const url = process.env.GAME_URL || 'ws://game-service:3000';

// Simple endpoint to 'play' which charges the user 10 units
async function playForUser(userId) {
  if (!userId) throw new Error('userId required');
  const resp = await fetch(`${url}/adjust`, {
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

// WebSocket server attached to the same HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('ws: client connected');
  ws.on('message', async (msg) => {
    try {
      const p = JSON.parse(msg);
      if (p.action === 'play' && p.userId) {
        try {
          const data = await playForUser(p.userId);
          ws.send(JSON.stringify({ status: 'ok', balance: data.balance }));
        } catch (err) {
          ws.send(JSON.stringify({ status: 'error', error: err.message, detail: err.detail || null }));
        }
      } else {
        ws.send(JSON.stringify({ status: 'error', error: 'invalid message' }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ status: 'error', error: 'invalid json' }));
    }
  });
});

