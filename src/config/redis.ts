

import Redis from "ioredis";
import { environment } from "./environment.js";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "REDIS_CONNECTION";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: environment.REDIS_HOST,
    port: environment.REDIS_PORT,
    password: environment.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy(attemptNumber: number): number | null {
      const MAX_RETRY_ATTEMPTS = 10;
      if (attemptNumber > MAX_RETRY_ATTEMPTS) {
        logger.error(`${SERVICE_NAME}_MAX_RETRIES_EXCEEDED - REDIS : ${attemptNumber}`);
        return null;
      }
      const retryDelayMs = Math.min(attemptNumber * 200, 3000);
      logger.warn(`${SERVICE_NAME}_RETRY - REDIS : attempt ${attemptNumber}, delay ${retryDelayMs}ms`);
      return retryDelayMs;
    },
  });

  redisClient.on("connect", () => {
    logger.info(`${SERVICE_NAME}_ESTABLISHED - REDIS : connected`);
  });

  redisClient.on("error", (connectionError: Error) => {
    logger.error(`${SERVICE_NAME}_ERROR - REDIS : ${connectionError.message}`);
  });

  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info(`${SERVICE_NAME}_CLOSED - REDIS : graceful shutdown`);
  }
}
