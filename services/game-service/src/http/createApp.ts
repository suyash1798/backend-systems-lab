import express from 'express';

function createApp() {
  const app = express();

  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'game-service' });
  });

  return app;
}

export default createApp;
