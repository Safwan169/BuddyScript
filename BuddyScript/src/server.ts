import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/env';
import { startMediaJobWorker } from './services/mediaJobs';

connectDatabase();
void startMediaJobWorker();

const server = app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
});

process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught exception:', err.message);
  process.exit(1);
});
