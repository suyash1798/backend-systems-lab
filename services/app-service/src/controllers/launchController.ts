import { Router } from 'express';
import { z } from 'zod';
import LaunchService from '../services/LaunchService';

const launchRequestSchema = z.object({
  deviceId: z.string().min(1)
});

class LaunchController {
  constructor(private readonly launchService = new LaunchService()) {}

  router(): Router {
    const router = Router();

    router.post('/games/:gameId/launch', this.launch.bind(this));

    return router;
  }

  private async launch(req: RouterRequest, res: RouterResponse): Promise<void> {
    const parsed = launchRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'invalid request' });
      return;
    }

    try {
      const response = await this.launchService.launch(req.params.gameId, parsed.data.deviceId);
      res.json(response);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  }
}

type RouterRequest = Parameters<Parameters<Router['post']>[1]>[0];
type RouterResponse = Parameters<Parameters<Router['post']>[1]>[1];

function createLaunchController(launchService = new LaunchService()): Router {
  return new LaunchController(launchService).router();
}

export default createLaunchController;
