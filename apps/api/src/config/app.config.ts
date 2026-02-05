import { registerAs } from '@nestjs/config';
import type { AppConfig } from './app-config.interface';

export const appConfig = registerAs('app', (): AppConfig => {
  const {
    PORT,
    MONGODB_URI,
    MONGODB_MAX_POOL_SIZE,
    MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    MONGODB_SOCKET_TIMEOUT_MS,
  } = process.env as Record<string, string>;
  const port = Number(PORT);
  return {
    server: {
      port: Number.isNaN(port) ? 4000 : port,
    },
    mongodb: {
      uri: MONGODB_URI ?? '',
      maxPoolSize: MONGODB_MAX_POOL_SIZE
        ? Number(MONGODB_MAX_POOL_SIZE)
        : undefined,
      serverSelectionTimeoutMS: MONGODB_SERVER_SELECTION_TIMEOUT_MS
        ? Number(MONGODB_SERVER_SELECTION_TIMEOUT_MS)
        : undefined,
      socketTimeoutMS: MONGODB_SOCKET_TIMEOUT_MS
        ? Number(MONGODB_SOCKET_TIMEOUT_MS)
        : undefined,
    },
  };
});
