function buildJoinPayload(client) {
  return {
    action: 'join',
    userId: client.userId,
    roomId: client.roomId
  };
}

function buildActionPayload(action, client, config) {
  if (action === 'spin') {
    return {
      action,
      roundId: `${client.userId}-${Date.now()}`,
      betAmount: config.betAmount
    };
  }

  return {
    action
  };
}

module.exports = {
  buildActionPayload,
  buildJoinPayload
};
