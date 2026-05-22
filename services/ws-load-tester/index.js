const config = require('./src/config');
const LoadTestRunner = require('./src/loadTestRunner');

const runner = new LoadTestRunner(config);

runner.start();

process.on('SIGINT', () => {
  runner.shutdown('interrupted');
});

process.on('SIGTERM', () => {
  runner.shutdown('terminated');
});
