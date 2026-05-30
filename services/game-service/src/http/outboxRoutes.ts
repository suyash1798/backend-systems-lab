import { Router } from 'express';
import OutboxRepository from '../repositories/OutboxRepository';

function createOutboxRoutes(outboxRepository: OutboxRepository): Router {
  const router = Router();

  router.get('/stats', async (req, res) => {
    const stats = await outboxRepository.stats();
    res.json({ service: 'game-service', outbox: stats });
  });

  return router;
}

export default createOutboxRoutes;
