import { Router } from 'express';
import { OutboxStore } from './types';

function createOutboxRoutes(serviceName: string, outboxStore: OutboxStore): Router {
  const router = Router();

  router.get('/stats', async (_req, res) => {
    const stats = await outboxStore.stats();
    res.json({ service: serviceName, outbox: stats });
  });

  return router;
}

export default createOutboxRoutes;
