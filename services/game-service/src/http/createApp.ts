import express from 'express';
import OutboxRepository from '../repositories/OutboxRepository';
import createOutboxRoutes from './outboxRoutes';

function createApp(outboxRepository?: OutboxRepository) {
  const app = express();

  // for ELB heart beat
  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'game-service' });
  });

  if (outboxRepository) {
    app.use('/outbox', createOutboxRoutes(outboxRepository));
  }

  return app;
}

export default createApp;
