import { GoogleGenerativeAI } from "@google/generative-ai";
import { environment } from "../../../config/environment.js";
import { logger } from "../../../utils/logger.js";

const SERVICE_NAME = "GEMINI_PROVIDER";

let geminiClient: GoogleGenerativeAI | null = null;
function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(environment.GEMINI_API_KEY);
  }
  return geminiClient;
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

export async function generateFallbackResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  toolContext: string
): Promise<LlmResponse> {
  logger.info(`${SERVICE_NAME}_GENERATING_FALLBACK - MESSAGE : ${userMessage.substring(0, 50)}`);

  try {
    const model = getGeminiClient().getGenerativeModel({ 
        model: environment.GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT
    });

    // Gemini requires the first message in history to be from the 'user'
    let history = conversationHistory.slice(-10).map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    if (history.length > 0 && history[0].role === "model") {
      history = history.slice(1);
    }

    const chat = model.startChat({
      history: history
    });

    const contextualMessage = toolContext
      ? `[INTERNAL DATA - NOT FOR USER DISPLAY]\n${toolContext}\n\n[USER QUERY]\n${userMessage}\n\nPlease summarize the data above specifically to answer the user's query.`
      : userMessage;

    const result = await chat.sendMessage(contextualMessage);
    const response = await result.response;
    const text = (response.text() || "").trim();
    const finalContent = text || "I am currently unable to distill this information. Please rephrase or consultation with the Relationship Manager directly.";

    logger.info(`${SERVICE_NAME}_FALLBACK_GENERATED`);

    return {
      content: finalContent,
      tokensUsed: 0,
      model: environment.GEMINI_MODEL,
    };
  } catch (apiError) {
    const errorMessage = apiError instanceof Error ? apiError.message : "Gemini API error";
    logger.error(`${SERVICE_NAME}_API_ERROR - ERROR : ${errorMessage}`);
    throw new Error(`Fallback Gemini LLM provider error: ${errorMessage}`);
  }
}
