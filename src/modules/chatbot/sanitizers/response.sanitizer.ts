

import { logger } from "../../../utils/logger.js";

const SERVICE_NAME = "RESPONSE_SANITIZER";

interface SanitizationResult {
  sanitizedContent: string;
  sanitizationApplied: boolean;
  patternsMatched: string[];
}

const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: "PAN_NUMBER",
    pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    replacement: "XX***XXXXX",
  },
  {
    name: "AADHAAR_NUMBER",
    pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    replacement: "XXXX XXXX ****",
  },
  {
    name: "BANK_ACCOUNT",
    pattern: /\b\d{9,18}\b/g,
    replacement: "****XXXX",
  },
  {
    name: "PHONE_NUMBER",
    pattern: /\+91[-\s]?\d{5}[-\s]?\d{5}/g,
    replacement: "+91-XXXXX-XXXXX",
  },
  {
    name: "EMAIL_IN_RESPONSE",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "****@****.***",
  },
];

export function sanitizeResponse(rawContent: string): SanitizationResult {
  let processedContent = rawContent;
  const matchedPatterns: string[] = [];

  for (const sensitiveRule of SENSITIVE_PATTERNS) {
    if (sensitiveRule.pattern.test(processedContent)) {
      matchedPatterns.push(sensitiveRule.name);
      processedContent = processedContent.replace(sensitiveRule.pattern, sensitiveRule.replacement);
      logger.info(
        `${SERVICE_NAME}_PATTERN_MASKED - PATTERN : ${sensitiveRule.name}`
      );
    }
  }

  return {
    sanitizedContent: processedContent,
    sanitizationApplied: matchedPatterns.length > 0,
    patternsMatched: matchedPatterns,
  };
}
