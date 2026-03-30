

import { logger } from "../../utils/logger.js";
import type { AuthenticatedUser } from "../../domain/interfaces/index.js";
import { UserRole } from "../../domain/enums/index.js";
import { classifyIntent, CrmIntent, type BlockedIntent } from "./orchestrators/intent-classifier.js";
import { checkBlockedIntent } from "./guards/blocked-intent.guard.js";
import { checkToolPermission } from "./guards/tool-permission.guard.js";
import { sanitizePromptInput } from "./sanitizers/prompt-injection.sanitizer.js";
import { sanitizeResponse } from "./sanitizers/response.sanitizer.js";
import { generateChatResponse } from "./providers/openai.provider.js";
import { generateFallbackResponse } from "./providers/gemini.provider.js";
import {
  getHighRiskClients,
  getTopAumClients,
  getUpcomingReviews,
  getComplianceOverdue,
  searchClients,
  getClientGoals,
} from "./tools/crm-tools.js";
import { ChatSessionModel, type ChatMessageEntry } from "../../models/chat-session.model.js";
import { ChatbotUsageModel } from "../../models/chatbot-usage.model.js";
import { logAuditEvent } from "../../services/audit.service.js";
import { ChatMessageRole } from "../../domain/enums/index.js";

const SERVICE_NAME = "CHAT_SERVICE";

interface ChatResponse {
  message: string;
  sessionId: string;
  intent: string;
  isBlocked: boolean;
}

const INTENT_TOOL_MAP: Record<string, (orgId: string, entities: Record<string, string>) => Promise<{ success: boolean; data: string }>> = {
  [CrmIntent.CLIENT_RISK_QUERY]: (orgId) => getHighRiskClients(orgId),
  [CrmIntent.AUM_QUERY]: (orgId) => getTopAumClients(orgId),
  [CrmIntent.REVIEW_QUERY]: (orgId) => getUpcomingReviews(orgId),
  [CrmIntent.COMPLIANCE_QUERY]: (orgId) => getComplianceOverdue(orgId),
  [CrmIntent.CLIENT_LOOKUP]: (orgId, entities) => searchClients(orgId, entities.clientName || ""),
  [CrmIntent.GOAL_QUERY]: (orgId, entities) => getClientGoals(orgId, entities.clientName || ""),
};

export async function processUserMessage(
  user: AuthenticatedUser,
  userMessage: string,
  sessionId?: string
): Promise<ChatResponse> {
  logger.info(`${SERVICE_NAME}_PROCESSING_MESSAGE - USER : ${user.userId}`);

  // STEP 1: Sanitize input against prompt injection
  const sanitizationCheck = sanitizePromptInput(userMessage);
  if (!sanitizationCheck.isSafe) {
    logger.warn(`${SERVICE_NAME}_INJECTION_BLOCKED - USER : ${user.userId}`);
    await logAuditEvent({
      orgId: user.orgId,
      userId: user.userId,
      action: "PROMPT_INJECTION_BLOCKED",
      resourceType: "chat",
      resourceId: sessionId || "unknown",
      details: { threatsDetected: sanitizationCheck.threatsDetected },
    });

    return {
      message: "I detected potentially harmful input. Please rephrase your question about CRM data.",
      sessionId: sessionId || "",
      intent: "blocked_injection",
      isBlocked: true,
    };
  }

  // STEP 2: Classify intent
  const classification = await classifyIntent(sanitizationCheck.sanitizedInput);

  // STEP 3: Check blocked intents BEFORE any LLM call
  if (classification.isBlocked) {
    const blockedResponse = checkBlockedIntent(classification.intent as unknown as string);

    await logAuditEvent({
      orgId: user.orgId,
      userId: user.userId,
      action: "BLOCKED_INTENT",
      resourceType: "chat",
      resourceId: classification.intent,
      details: { originalMessage: sanitizationCheck.sanitizedInput.substring(0, 100) },
    });

    return {
      message: blockedResponse.message,
      sessionId: sessionId || "",
      intent: classification.intent as string,
      isBlocked: true,
    };
  }

  // STEP 4: Get or create session
  const activeSession = await getOrCreateSession(user, sessionId);
  const activeSessionId = activeSession._id.toString();

  // STEP 5: Save user message
  const userMessageEntry: ChatMessageEntry = {
    role: ChatMessageRole.USER,
    content: sanitizationCheck.sanitizedInput,
    timestamp: new Date(),
  };
  activeSession.messages.push(userMessageEntry);

  // STEP 6: Execute CRM tools based on intent
  let toolContext = "";
  const intentHandler = INTENT_TOOL_MAP[classification.intent as string];

  if (intentHandler) {
    const toolName = getToolNameForIntent(classification.intent as CrmIntent);
    const permissionCheck = checkToolPermission(user.role as UserRole, toolName);

    if (!permissionCheck.isAllowed) {
      return {
        message: permissionCheck.reason,
        sessionId: activeSessionId,
        intent: classification.intent as string,
        isBlocked: true,
      };
    }

    const toolResult = await intentHandler(user.orgId, classification.entities);
    toolContext = toolResult.data;

    await logAuditEvent({
      orgId: user.orgId,
      userId: user.userId,
      action: "TOOL_EXECUTED",
      resourceType: "chat_tool",
      resourceId: toolName,
      details: { intent: classification.intent },
    });
  }

  // STEP 7: Generate response (primary -> fallback)
  let llmResponse;
  const conversationHistory = activeSession.messages
    .filter((messageEntry) => messageEntry.role !== ChatMessageRole.SYSTEM)
    .map((messageEntry) => ({ role: messageEntry.role, content: messageEntry.content }));

  try {
    llmResponse = await generateChatResponse(
      sanitizationCheck.sanitizedInput,
      conversationHistory,
      toolContext
    );
  } catch {
    logger.warn(`${SERVICE_NAME}_PRIMARY_LLM_FAILED - USER : ${user.userId} : falling back to Gemini`);
    try {
      llmResponse = await generateFallbackResponse(
        sanitizationCheck.sanitizedInput,
        conversationHistory,
        toolContext
      );
    } catch {
      // WHY: If both LLMs fail and we have tool data, return that directly
      if (toolContext) {
        llmResponse = { content: toolContext, tokensUsed: 0, model: "direct_tool" };
      } else {
        return {
          message: "I'm temporarily unable to process your request. Please try again or use the CRM interface directly.",
          sessionId: activeSessionId,
          intent: classification.intent as string,
          isBlocked: false,
        };
      }
    }
  }

  // STEP 8: Sanitize response output
  const sanitizedOutput = sanitizeResponse(llmResponse.content);
  if (sanitizedOutput.sanitizationApplied) {
    await logAuditEvent({
      orgId: user.orgId,
      userId: user.userId,
      action: "RESPONSE_SANITIZED",
      resourceType: "chat",
      resourceId: activeSessionId,
      details: { patternsMatched: sanitizedOutput.patternsMatched },
    });
  }

  // STEP 9: Save assistant message
  const assistantMessage: ChatMessageEntry = {
    role: ChatMessageRole.ASSISTANT,
    content: sanitizedOutput.sanitizedContent,
    timestamp: new Date(),
  };
  activeSession.messages.push(assistantMessage);
  activeSession.metadata.totalTokensUsed += llmResponse.tokensUsed;
  activeSession.metadata.lastModelUsed = llmResponse.model;
  activeSession.metadata.intentHistory.push(classification.intent as string);
  await activeSession.save();

  // STEP 10: Track usage
  await trackUsage(user, llmResponse.tokensUsed, llmResponse.model);

  return {
    message: sanitizedOutput.sanitizedContent,
    sessionId: activeSessionId,
    intent: classification.intent as string,
    isBlocked: false,
  };
}

async function getOrCreateSession(user: AuthenticatedUser, sessionId?: string) {
  if (sessionId) {
    const existingSession = await ChatSessionModel.findOne({
      _id: sessionId,
      userId: user.userId,
      orgId: user.orgId,
      isActive: true,
    });
    if (existingSession) {
      return existingSession;
    }
  }

  return ChatSessionModel.create({
    orgId: user.orgId,
    userId: user.userId,
    userRole: user.role,
    messages: [],
  });
}

async function trackUsage(user: AuthenticatedUser, tokensUsed: number, modelName: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentHour = new Date().getHours().toString();

  try {
    await ChatbotUsageModel.findOneAndUpdate(
      { orgId: user.orgId, userId: user.userId, date: today },
      {
        $inc: {
          dailyMessageCount: 1,
          dailyTokenCount: tokensUsed,
          [`hourlyUsage.${currentHour}`]: 1,
          [`modelUsage.${modelName}`]: 1,
        },
      },
      { upsert: true }
    );
  } catch (usageError) {
    // WHY: Usage tracking failures must NOT block the chat response
    const errorMessage = usageError instanceof Error ? usageError.message : "Usage tracking error";
    logger.error(`${SERVICE_NAME}_USAGE_TRACKING_FAILED - USER : ${user.userId} : ${errorMessage}`);
  }
}

function getToolNameForIntent(intent: CrmIntent): string {
  const intentToolNameMap: Record<string, string> = {
    [CrmIntent.CLIENT_RISK_QUERY]: "getClientList",
    [CrmIntent.AUM_QUERY]: "getClientList",
    [CrmIntent.REVIEW_QUERY]: "getReviews",
    [CrmIntent.COMPLIANCE_QUERY]: "getCompliance",
    [CrmIntent.CLIENT_LOOKUP]: "getClientList",
    [CrmIntent.GOAL_QUERY]: "getGoals",
    [CrmIntent.PORTFOLIO_QUERY]: "getPortfolio",
  };
  return intentToolNameMap[intent] || "getClientList";
}

export async function getChatSessions(userId: string, orgId: string) {
  return ChatSessionModel.find({ userId, orgId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();
}

export async function getChatUsage(userId: string, orgId: string) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  return ChatbotUsageModel.find({
    userId,
    orgId,
    date: { $gte: last30Days },
  })
    .sort({ date: -1 })
    .lean();
}
