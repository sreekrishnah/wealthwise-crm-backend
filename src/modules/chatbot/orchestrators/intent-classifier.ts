

import { logger } from "../../../utils/logger.js";
import OpenAI from "openai";
import { environment } from "../../../config/environment.js";

const SERVICE_NAME = "INTENT_CLASSIFIER";

let openaiClient: OpenAI | null = null;
function getOpenAiClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: environment.OPENAI_API_KEY });
  }
  return openaiClient;
}

export enum CrmIntent {
  CLIENT_LOOKUP = "client_lookup",
  CLIENT_RISK_QUERY = "client_risk_query",
  AUM_QUERY = "aum_query",
  REVIEW_QUERY = "review_query",
  COMPLIANCE_QUERY = "compliance_query",
  GOAL_QUERY = "goal_query",
  PORTFOLIO_QUERY = "portfolio_query",
  SCHEDULE_REVIEW = "schedule_review",
  CREATE_TASK = "create_task",
  GENERAL_GREETING = "general_greeting",
  GENERAL_HELP = "general_help",
  UNKNOWN = "unknown",
}

export enum BlockedIntent {
  INVESTMENT_ADVICE = "investment_advice",
  RECOMMENDATION = "recommendation",
  PREDICTION = "prediction",
  PERSONAL_OPINION = "personal_opinion",
}

interface IntentClassificationResult {
  intent: CrmIntent | BlockedIntent;
  confidence: number;
  isBlocked: boolean;
  entities: Record<string, string>;
}

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; intent: BlockedIntent }> = [
  { pattern: /\b(should\s+i\s+(invest|buy|sell)|recommend|suggest\s+investment|which\s+(stock|fund|scheme))\b/i, intent: BlockedIntent.INVESTMENT_ADVICE },
  { pattern: /\b(best\s+(stock|fund|investment)|top\s+picks?|where\s+to\s+invest)\b/i, intent: BlockedIntent.RECOMMENDATION },
  { pattern: /\b(predict|forecast|will\s+(market|stock|nifty)|what\s+will\s+happen)\b/i, intent: BlockedIntent.PREDICTION },
  { pattern: /\b(your\s+opinion|do\s+you\s+think|what\s+do\s+you\s+feel)\b/i, intent: BlockedIntent.PERSONAL_OPINION },
];

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: CrmIntent }> = [
  { pattern: /\b(high\s+risk|critical\s+risk|risk\s+score|at\s+risk|churn)\b/i, intent: CrmIntent.CLIENT_RISK_QUERY },
  { pattern: /\b(aum|assets?\s+under|total\s+(value|aum)|portfolio\s+value)\b/i, intent: CrmIntent.AUM_QUERY },
  { pattern: /\b(review|upcoming\s+review|scheduled\s+review|due\s+review)\b/i, intent: CrmIntent.REVIEW_QUERY },
  { pattern: /\b(compliance|kyc|overdue|nomination|risk\s+profile\s+update)\b/i, intent: CrmIntent.COMPLIANCE_QUERY },
  { pattern: /\b(goal|target|retirement|education\s+fund|savings?\s+goal)\b/i, intent: CrmIntent.GOAL_QUERY },
  { pattern: /\b(portfolio|holding|allocation|equity|mutual\s+fund|debt)\b/i, intent: CrmIntent.PORTFOLIO_QUERY },
  { pattern: /\b(schedule\s+review|book\s+review|set\s+up\s+review)\b/i, intent: CrmIntent.SCHEDULE_REVIEW },
  { pattern: /\b(create\s+task|add\s+task|new\s+task)\b/i, intent: CrmIntent.CREATE_TASK },
  { pattern: /\b(client|customer|search\s+client|find\s+client|show\s+(me\s+)?client)\b/i, intent: CrmIntent.CLIENT_LOOKUP },
  { pattern: /\b(hello|hi|hey|good\s+(morning|afternoon|evening))\b/i, intent: CrmIntent.GENERAL_GREETING },
  { pattern: /\b(help|what\s+can\s+you|how\s+to|assist)\b/i, intent: CrmIntent.GENERAL_HELP },
];

export async function classifyIntent(userMessage: string): Promise<IntentClassificationResult> {
  logger.info(`${SERVICE_NAME}_CLASSIFYING - MESSAGE : ${userMessage.substring(0, 50)}`);

  // STEP 1: Quick security check for obvious blocked items before calling LLM
  for (const blockedRule of BLOCKED_PATTERNS) {
    if (blockedRule.pattern.test(userMessage)) {
      logger.warn(`${SERVICE_NAME}_BLOCKED_INTENT - TYPE : ${blockedRule.intent}`);
      return {
        intent: blockedRule.intent,
        confidence: 0.95,
        isBlocked: true,
        entities: {},
      };
    }
  }

  // STEP 2: Use LLM for intelligent intent mapping
  try {
    const response = await getOpenAiClient().chat.completions.create({
      model: "gpt-4o-mini", // Use smaller model for faster classification
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for a Wealth Management CRM. 
          Classify the user's message into one of these intents: ${Object.values(CrmIntent).join(", ")}.
          Also extract entities like clientName, timeframe, or segment.
          
          Return ONLY valid JSON in this format:
          { "intent": "intent_name", "confidence": 0.9, "entities": { "clientName": "...", "segment": "..." } }`
        },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    logger.info(`${SERVICE_NAME}_CLASSIFIED - INTENT : ${result.intent}`);

    return {
      intent: result.intent as CrmIntent,
      confidence: result.confidence || 0.8,
      isBlocked: false,
      entities: result.entities || {},
    };
  } catch (error) {
    logger.error(`${SERVICE_NAME}_CLASSIFICATION_FAILED - Falling back to UNKNOWN : ${error}`);
    return {
      intent: CrmIntent.UNKNOWN,
      confidence: 0,
      isBlocked: false,
      entities: {},
    };
  }
}

function extractEntities(message: string): Record<string, string> {
  const entities: Record<string, string> = {};

  const nameMatch = message.match(/(?:client|for|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (nameMatch) {
    entities.clientName = nameMatch[1];
  }

  const timeMatch = message.match(/\b(today|tomorrow|this\s+week|next\s+week|this\s+month)\b/i);
  if (timeMatch) {
    entities.timeframe = timeMatch[1].toLowerCase();
  }

  const segmentMatch = message.match(/\b(UHNI|HNI|Retail|Corporate)\b/i);
  if (segmentMatch) {
    entities.segment = segmentMatch[1].toUpperCase();
  }

  return entities;
}
