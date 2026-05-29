import express from 'express';
import config from './config';
import createLaunchController from './controllers/launchController';

const app = express();

app.use(express.json());
app.use(createLaunchController());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'app-service' });
});

app.listen(config.port, () => {
  console.log(`app-service listening on ${config.port}`);
});
