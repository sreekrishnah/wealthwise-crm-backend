

import type { Request, Response, NextFunction } from "express";
import { processUserMessage, getChatSessions, getChatUsage } from "../modules/chatbot/chat.service.js";
import { logAuditEvent } from "../services/audit.service.js";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "CHAT_CONTROLLER";

export async function handleChatMessage(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = request.user!;
    const { message, sessionId } = request.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      response.status(400).json({ success: false, error: "Message is required." });
      return;
    }

    await logAuditEvent({
      orgId: user.orgId,
      userId: user.userId,
      action: "CHAT_MESSAGE_SENT",
      resourceType: "chat",
      resourceId: sessionId || "new_session",
      ipAddress: request.ip,
    });

    const chatResult = await processUserMessage(user, message.trim(), sessionId);

    // WHY: SSE format for streaming compatibility — frontend can upgrade to SSE later
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    response.write(`data: ${JSON.stringify({
      type: "message",
      content: chatResult.message,
      sessionId: chatResult.sessionId,
      intent: chatResult.intent,
      isBlocked: chatResult.isBlocked,
    })}\n\n`);

    response.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    response.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Chat processing failed";
    logger.error(`${SERVICE_NAME}_MESSAGE_ERROR - USER : ${request.user?.userId} : ${errorMessage}`);
    next(error);
  }
}

export async function handleGetSessions(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = request.user!;
    const sessions = await getChatSessions(user.userId, user.orgId);
    response.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
}

export async function handleGetUsage(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = request.user!;
    const usage = await getChatUsage(user.userId, user.orgId);
    response.json({ success: true, data: usage });
  } catch (error) {
    next(error);
  }
}

export async function handleFeedback(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = request.user!;
    const { sessionId, messageIndex, rating, comment } = request.body;

    await logAuditEvent({
      orgId: user.orgId,
      userId: user.userId,
      action: "CHAT_FEEDBACK",
      resourceType: "chat",
      resourceId: sessionId,
      details: { messageIndex, rating, comment },
      ipAddress: request.ip,
    });

    response.json({ success: true, data: { received: true } });
  } catch (error) {
    next(error);
  }
}
