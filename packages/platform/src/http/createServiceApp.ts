import express, { Express } from 'express';

function createServiceApp(serviceName: string): Express {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: serviceName });
  });

  return app;
}

export default createServiceApp;
