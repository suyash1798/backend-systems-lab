const WebSocket = require('ws');

const wsUrl = process.env.GAME_URL || 'ws://game-service:3000';
const userId = process.env.USER_ID || 'user-1';

function connect() {

  console.log(process.memoryUsage())
  for(let i = 0; i < 1000; i++){
    new WebSocket(wsUrl)
  }
  const ws = new WebSocket(wsUrl);
  console.log(wsUrl, process.env.GAME_URL)

  ws.on('open', () => {
    console.log('connected to game-service via websocket');
    // send a play every 5 seconds
    setInterval(() => {
      const msg = JSON.stringify({ action: 'play', userId });
      console.log('sending', msg);
      ws.send(msg);
    }, 5000);
  });

  ws.on('message', (m) => console.log('recv', m.toString()));
  ws.on('close', () => {
    console.log('ws closed, reconnecting in 2s');
    setTimeout(connect, 2000);
  });
  ws.on('error', (e) => console.error('ws error', e.message));
}

connect();
