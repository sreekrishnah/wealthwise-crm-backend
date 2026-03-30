

import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "ERROR_HANDLER";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createAppError(message: string, statusCode: number): AppError {
  const applicationError: AppError = new Error(message);
  applicationError.statusCode = statusCode;
  applicationError.isOperational = true;
  return applicationError;
}

// WHY: Centralized error handler prevents leaking internal details to client
export function globalErrorHandler(
  error: AppError,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const isOperationalError = error.isOperational || false;

  logger.error(
    `${SERVICE_NAME}_CAUGHT - ${request.method} ${request.path} : ${error.message}`
  );

  if (statusCode === 500) {
    logger.error(`${SERVICE_NAME}_STACK_TRACE - ${request.path} : ${error.stack}`);
  }

  if (isOperationalError) {
    response.status(statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  // WHY: Non-operational errors may contain sensitive internals — return generic message
  response.status(500).json({
    success: false,
    error: "An unexpected error occurred. Please try again or contact support.",
  });
}

export function notFoundHandler(request: Request, response: Response): void {
  logger.warn(`${SERVICE_NAME}_NOT_FOUND - ${request.method} ${request.originalUrl}`);
  response.status(404).json({
    success: false,
    error: `Route ${request.method} ${request.originalUrl} not found.`,
  });
}
