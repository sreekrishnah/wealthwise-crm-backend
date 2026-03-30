

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { environment } from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initializeSocketServer } from "./socket/socket-handler.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/error-handler.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limiter.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { clientRouter } from "./routes/client.routes.js";
import { portfolioRouter } from "./routes/portfolio.routes.js";
import { pipelineRouter } from "./routes/pipeline.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { complianceRouter } from "./routes/compliance.routes.js";
import { goalRouter } from "./routes/goal.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { billingRoutes } from "./routes/billing.routes.js";
import { logger } from "./utils/logger.js";

const SERVICE_NAME = "SERVER";

async function startServer(): Promise<void> {
  const app = express();
  const httpServer = createServer(app);

  // Global middleware
  app.use(helmet());
  app.use(cors({ origin: environment.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("combined", {
    stream: { write: (logMessage: string) => logger.info(logMessage.trim()) },
  }));
  app.use(apiRateLimiter);

  // Health check (no auth required)
  app.get("/api/v1/health", (_request, response) => {
    response.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
    });
  });

  // API routes
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/clients", clientRouter);
  app.use("/api/v1/portfolio", portfolioRouter);
  app.use("/api/v1/pipeline", pipelineRouter);
  app.use("/api/v1/reviews", reviewRouter);
  app.use("/api/v1/compliance", complianceRouter);
  app.use("/api/v1/goals", goalRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/chat", chatRouter);
  app.use("/api/v1/billing", billingRoutes);

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  // Database connection
  await connectDatabase();

  // Socket.io initialization
  initializeSocketServer(httpServer);

  // BullMQ initialization (conditional — only if Redis is available)
  try {
    const { initializeJobQueues, scheduleRecurringJobs } = await import("./jobs/job-processor.js");
    initializeJobQueues();
    await scheduleRecurringJobs();
    logger.info(`${SERVICE_NAME}_BULLMQ_INITIALIZED - JOBS : active`);
  } catch (bullmqError) {
    // WHY: BullMQ failure should NOT prevent server startup — CRM is the core, jobs are supplementary
    const errorMessage = bullmqError instanceof Error ? bullmqError.message : "BullMQ init error";
    logger.warn(`${SERVICE_NAME}_BULLMQ_SKIPPED - REASON : ${errorMessage}`);
  }

  // Start listening
  httpServer.listen(environment.PORT, () => {
    logger.info(`${SERVICE_NAME}_STARTED - PORT : ${environment.PORT} : ENV : ${environment.NODE_ENV}`);
    logger.info(`${SERVICE_NAME}_CORS - ORIGIN : ${environment.CORS_ORIGIN}`);
    logger.info(`${SERVICE_NAME}_ROUTES - API : /api/v1/*`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${SERVICE_NAME}_SHUTDOWN - SIGNAL : ${signal}`);
    httpServer.close();
    await disconnectDatabase();
    logger.info(`${SERVICE_NAME}_SHUTDOWN_COMPLETE - SIGNAL : ${signal}`);
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error(`${SERVICE_NAME}_UNHANDLED_REJECTION - REASON : ${reason}`);
  });

  process.on("uncaughtException", (error) => {
    logger.error(`${SERVICE_NAME}_UNCAUGHT_EXCEPTION - ERROR : ${error.message}`);
    process.exit(1);
  });
}

startServer().catch((startupError) => {
  logger.error(`${SERVICE_NAME}_STARTUP_FAILED - ERROR : ${startupError}`);
  process.exit(1);
});
