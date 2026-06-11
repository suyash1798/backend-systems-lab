import express from 'express';
import config from './config';
import createLaunchController from './controllers/launchController';
import createRateLimitMiddleware from './rateLimiter/createRateLimitMiddleware';
import RateLimiter from './rateLimiter/RateLimiter';
import { normalApiRule, otpApiRule } from './rateLimiter/rules';

const app = express();
const rateLimiter = new RateLimiter(config.redisUrl);

app.use(express.json());
app.use('/games', createRateLimitMiddleware(rateLimiter, {
  rule: normalApiRule,
  key: (req) => String(req.body?.deviceId || req.ip)
}));
app.use(createLaunchController());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'app-service' });
});

app.get('/normal-api', createRateLimitMiddleware(rateLimiter, {
  rule: normalApiRule,
  key: (req) => String(req.header('X-Player-Id') || req.ip)
}), (_req, res) => {
  res.json({ status: 'ok', type: 'normal-api' });
});

app.get('/otp-api', createRateLimitMiddleware(rateLimiter, {
  rule: otpApiRule,
  key: (req) => String(req.header('X-Player-Id') || req.ip)
}), (_req, res) => {
  res.json({ status: 'ok', type: 'otp-api' });
});

async function start(): Promise<void> {
  await rateLimiter.connect();

  app.listen(config.port, () => {
    console.log(`app-service listening on ${config.port}`);
  });
}

start().catch((err) => {
  console.error('app-service failed to start', err.message);
  process.exit(1);
});
