function buildJoinPayload(client) {
  return {
    action: 'join',
    userId: client.userId,
    roomId: client.roomId
  };
}

function buildActionPayload(action, client) {
  return {
    action
  };
}

module.exports = {
  buildActionPayload,
  buildJoinPayload
};
