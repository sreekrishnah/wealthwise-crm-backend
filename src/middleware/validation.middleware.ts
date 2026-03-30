

import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "VALIDATION_MIDDLEWARE";

interface ValidationTarget {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationTarget) {
  return (request: Request, response: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        request.body = schemas.body.parse(request.body);
      }
      if (schemas.query) {
        request.query = schemas.query.parse(request.query) as typeof request.query;
      }
      if (schemas.params) {
        request.params = schemas.params.parse(request.params);
      }
      next();
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const formattedErrors = validationError.errors.map((zodIssue) => ({
          field: zodIssue.path.join("."),
          message: zodIssue.message,
        }));

        logger.warn(
          `${SERVICE_NAME}_VALIDATION_FAILED - ${request.path} : ${JSON.stringify(formattedErrors)}`
        );

        response.status(400).json({
          success: false,
          error: "Validation failed. Please check the input fields.",
          details: formattedErrors,
        });
        return;
      }

      next(validationError);
    }
  };
}
