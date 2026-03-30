

import { logger } from "../../../utils/logger.js";

const SERVICE_NAME = "BLOCKED_INTENT_GUARD";

interface BlockedIntentResponse {
  isBlocked: boolean;
  message: string;
}

const BLOCKED_RESPONSES: Record<string, string> = {
  investment_advice:
    "I'm unable to provide investment advice as it requires SEBI-registered advisory qualifications. " +
    "Please consult your Relationship Manager for personalized guidance.\n\n" +
    "I can help you with:\n" +
    "• Viewing your portfolio holdings\n" +
    "• Checking review schedules\n" +
    "• Compliance task status",
  recommendation:
    "Product or investment recommendations require professional advisory assessment. " +
    "Your RM can provide tailored suggestions based on your risk profile.\n\n" +
    "Would you like me to check your upcoming review date?",
  prediction:
    "Market predictions and forecasting are outside my capabilities and regulatory boundaries. " +
    "For market insights, please speak with your Relationship Manager.\n\n" +
    "I can help you review your current portfolio performance and risk metrics.",
  personal_opinion:
    "I provide factual CRM data only and don't offer personal opinions. " +
    "For subjective financial analysis, your RM is the right person to consult.\n\n" +
    "How else can I help with your account information?",
};

export function checkBlockedIntent(intentType: string): BlockedIntentResponse {
  const blockedMessage = BLOCKED_RESPONSES[intentType];

  if (blockedMessage) {
    logger.warn(`${SERVICE_NAME}_INTENT_BLOCKED - TYPE : ${intentType}`);
    return { isBlocked: true, message: blockedMessage };
  }

  return { isBlocked: false, message: "" };
}
