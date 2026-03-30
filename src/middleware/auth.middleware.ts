

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";
import { logger } from "../utils/logger.js";
import type { AuthenticatedUser } from "../domain/interfaces/index.js";
import { UserRole } from "../domain/enums/index.js";

const SERVICE_NAME = "AUTH_MIDDLEWARE";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export function authenticateToken(request: Request, response: Response, next: NextFunction): void {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    logger.warn(`${SERVICE_NAME}_MISSING_TOKEN - REQUEST : ${request.ip}`);
    response.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
    });
    return;
  }

  const token = authorizationHeader.split(" ")[1];

  try {
    const decodedPayload = jwt.verify(token, environment.JWT_SECRET) as JwtPayload;

    request.user = {
      userId: decodedPayload.userId,
      orgId: decodedPayload.orgId,
      role: decodedPayload.role,
      email: decodedPayload.email,
      name: decodedPayload.name,
    };

    next();
  } catch (verificationError) {
    const errorMessage = verificationError instanceof Error ? verificationError.message : "Token verification failed";
    logger.warn(`${SERVICE_NAME}_INVALID_TOKEN - REQUEST : ${request.ip} : ${errorMessage}`);
    response.status(401).json({
      success: false,
      error: "Invalid or expired authentication token. Please log in again.",
    });
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({
        success: false,
        error: "Authentication required before authorization check.",
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      logger.warn(
        `${SERVICE_NAME}_UNAUTHORIZED_ROLE - ${request.user.userId} : attempted ${request.user.role}, required ${allowedRoles.join(",")}`
      );
      response.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}
