

import mongoose from "mongoose";
import { environment } from "./environment.js";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "DATABASE_CONNECTION";

export async function connectDatabase(): Promise<void> {
  try {
    logger.info(`${SERVICE_NAME}_INITIATING_CONNECTION - MONGODB : ${environment.MONGODB_URI.substring(0, 30)}...`);

    mongoose.connection.on("connected", () => {
      logger.info(`${SERVICE_NAME}_ESTABLISHED - MONGODB : connected`);
    });

    mongoose.connection.on("error", (connectionError: Error) => {
      logger.error(`${SERVICE_NAME}_ERROR - MONGODB : ${connectionError.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn(`${SERVICE_NAME}_DISCONNECTED - MONGODB : reconnecting...`);
    });

    await mongoose.connect(environment.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (connectionError) {
    const errorMessage = connectionError instanceof Error ? connectionError.message : "Unknown database error";
    logger.error(`${SERVICE_NAME}_FAILED - MONGODB : ${errorMessage}`);
    throw new Error(`Database connection failed: ${errorMessage}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info(`${SERVICE_NAME}_CLOSED - MONGODB : graceful shutdown`);
  } catch (disconnectError) {
    const errorMessage = disconnectError instanceof Error ? disconnectError.message : "Unknown disconnect error";
    logger.error(`${SERVICE_NAME}_DISCONNECT_ERROR - MONGODB : ${errorMessage}`);
  }
}
