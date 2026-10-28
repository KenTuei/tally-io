import { buildApp } from './app/app.js';
import { config } from './config/config.js';
import { logger } from './config/logger.js';

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: config.port,
      host: config.host,
    });
    logger.info(`Tally.io backend listening at ${address}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`API docs: ${address}/api/docs`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();
