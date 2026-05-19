const express = require('express');

function createApp() {
  const app = express();

  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'game-service' });
  });

  return app;
}

module.exports = createApp;
