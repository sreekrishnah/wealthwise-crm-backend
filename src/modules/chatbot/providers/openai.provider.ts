

import OpenAI from "openai";
import { environment } from "../../../config/environment.js";
import { logger } from "../../../utils/logger.js";

const SERVICE_NAME = "OPENAI_PROVIDER";

let openaiClient: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: environment.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are a Wealth Management CRM assistant for a SEBI-compliant wealth management firm.

CRITICAL RULES:
- You are a professional assistant. NEVER show "Tool Call", "Tool Output", JSON, or any internal debug logs to the user.
- Summarize data in a clean, human-friendly way. Use lists or simple markdown tables.
- You are NOT an independent AI. You are an interface over CRM data.
- NEVER provide investment advice, recommendations, or predictions.
- NEVER make up data. Only present data from tool results provided in the context.
- Always recommend consulting the Relationship Manager for advisory needs.
- Format responses with clean markdown (titles, bold text, bullets).
- Keep responses concise and professional.
- If data is missing or not found, simply say "I couldn't find any data for..." instead of showing JSON errors.`;

interface LlmResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  toolContext: string
): Promise<LlmResponse> {
  logger.info(`${SERVICE_NAME}_GENERATING_RESPONSE - MESSAGE : ${userMessage.substring(0, 50)}`);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // WHY: Include conversation history for context continuity, but capped by session model
  for (const historyMessage of conversationHistory.slice(-10)) {
    messages.push({
      role: historyMessage.role as "user" | "assistant",
      content: historyMessage.content,
    });
  }

  if (toolContext) {
    messages.push({
      role: "system",
      content: `INTERNAL DATA (NOT FOR USER DISPLAY):\n${toolContext}\n\nPlease analyze this data and answer the user's question.`,
    });
  }

  messages.push({ role: "user", content: userMessage });

  try {
    const completion = await getOpenAiClient().chat.completions.create({
      model: environment.OPENAI_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseContent = (completion.choices[0]?.message?.content || "").trim();
    const finalContent = responseContent || "I'm unable to formulate a specific answer based on the current data. Could you please rephrase?";
    const tokenCount = completion.usage?.total_tokens || 0;

    logger.info(`${SERVICE_NAME}_RESPONSE_GENERATED - TOKENS : ${tokenCount}`);

    return {
      content: finalContent,
      tokensUsed: tokenCount,
      model: environment.OPENAI_MODEL,
    };
  } catch (apiError) {
    const errorMessage = apiError instanceof Error ? apiError.message : "OpenAI API error";
    logger.error(`${SERVICE_NAME}_API_ERROR - ERROR : ${errorMessage}`);
    throw new Error(`LLM provider error: ${errorMessage}`);
  }
}
