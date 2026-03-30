

import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "SOCKET_HANDLER";

interface AuthenticatedSocket {
  userId: string;
  orgId: string;
  role: string;
}

let socketServer: SocketServer | null = null;

export function initializeSocketServer(httpServer: HttpServer): SocketServer {
  socketServer = new SocketServer(httpServer, {
    cors: {
      origin: environment.CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  socketServer.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      logger.warn(`${SERVICE_NAME}_AUTH_MISSING - SOCKET : ${socket.id}`);
      next(new Error("Authentication required"));
      return;
    }

    try {
      const decoded = jwt.verify(token as string, environment.JWT_SECRET) as AuthenticatedSocket;
      socket.data.user = decoded;
      next();
    } catch {
      logger.warn(`${SERVICE_NAME}_AUTH_FAILED - SOCKET : ${socket.id}`);
      next(new Error("Invalid authentication token"));
    }
  });

  socketServer.on("connection", (socket) => {
    const socketUser = socket.data.user as AuthenticatedSocket;
    const orgRoom = `org:${socketUser.orgId}`;
    const userRoom = `user:${socketUser.userId}`;

    socket.join(orgRoom);
    socket.join(userRoom);

    logger.info(`${SERVICE_NAME}_CONNECTED - USER : ${socketUser.userId} : SOCKET : ${socket.id}`);

    socket.on("disconnect", () => {
      logger.info(`${SERVICE_NAME}_DISCONNECTED - USER : ${socketUser.userId} : SOCKET : ${socket.id}`);
    });
  });

  logger.info(`${SERVICE_NAME}_INITIALIZED - SOCKET_SERVER : ready`);

  return socketServer;
}

// WHY: Typed emit functions for CRM events — not general-purpose broadcasting
export function emitComplianceAlert(orgId: string, alertData: Record<string, unknown>): void {
  if (socketServer) {
    socketServer.to(`org:${orgId}`).emit("compliance:alert", alertData);
    logger.info(`${SERVICE_NAME}_EMIT_COMPLIANCE_ALERT - ORG : ${orgId}`);
  }
}

export function emitReviewReminder(userId: string, reminderData: Record<string, unknown>): void {
  if (socketServer) {
    socketServer.to(`user:${userId}`).emit("review:reminder", reminderData);
    logger.info(`${SERVICE_NAME}_EMIT_REVIEW_REMINDER - USER : ${userId}`);
  }
}

export function emitNotification(userId: string, notificationData: Record<string, unknown>): void {
  if (socketServer) {
    socketServer.to(`user:${userId}`).emit("notification", notificationData);
  }
}
