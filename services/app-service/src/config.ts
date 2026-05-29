export default {
  port: Number(process.env.PORT || 7000),
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:6000',
  lobbyServiceUrl: process.env.LOBBY_SERVICE_URL || 'http://lobby-service:5000',
  websocketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:8080/game/ws'
};
