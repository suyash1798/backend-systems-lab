const WebSocket = require('ws');

function createClient({ index, config, onOpen, onMessage, onClose, onError }) {
  const ws = new WebSocket(config.targetUrl);
  const client = {
    ws,
    index,
    userId: `${config.userIdPrefix}-${index}`,
    roomId: `${config.roomIdPrefix}-${index % config.rooms}`,
    interval: null
  };

  ws.on('open', () => onOpen(client));
  ws.on('message', (raw) => onMessage(raw));
  ws.on('close', () => onClose(client));
  ws.on('error', (err) => onError(err));

  return client;
}

module.exports = createClient;
