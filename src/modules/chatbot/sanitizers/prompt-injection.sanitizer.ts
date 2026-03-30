

import { logger } from "../../../utils/logger.js";

const SERVICE_NAME = "PROMPT_INJECTION_SANITIZER";

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(all\s+)?previous/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(a\s+)?/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /<\s*\|?\s*(system|prompt|im_start)\s*\|?\s*>/i,
  /override\s+(system|safety)/i,
  /DAN\s+mode/i,
  /jailbreak/i,
];

interface InjectionCheckResult {
  isSafe: boolean;
  sanitizedInput: string;
  threatsDetected: string[];
}

export function sanitizePromptInput(rawInput: string): InjectionCheckResult {
  const detectedThreats: string[] = [];

  for (const injectionPattern of INJECTION_PATTERNS) {
    if (injectionPattern.test(rawInput)) {
      detectedThreats.push(injectionPattern.source);
    }
  }

  if (detectedThreats.length > 0) {
    logger.warn(
      `${SERVICE_NAME}_INJECTION_DETECTED - THREATS : ${detectedThreats.length}`
    );
    return {
      isSafe: false,
      sanitizedInput: "",
      threatsDetected: detectedThreats,
    };
  }

  // WHY: Strip control characters and excessive whitespace even from safe inputs
  const cleanedInput = rawInput
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 2000);

  return {
    isSafe: true,
    sanitizedInput: cleanedInput,
    threatsDetected: [],
  };
}
