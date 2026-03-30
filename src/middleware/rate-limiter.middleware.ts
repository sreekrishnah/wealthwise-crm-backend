

import rateLimit from "express-rate-limit";
import { environment } from "../config/environment.js";

export const apiRateLimiter = rateLimit({
  windowMs: environment.RATE_LIMIT_WINDOW_MS,
  max: environment.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => {
    const userIdentifier = request.user?.userId || request.ip || "anonymous";
    return `chat:${userIdentifier}`;
  },
  message: {
    success: false,
    error: "Chat rate limit reached. Please try again in the next hour.",
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts. Please wait 15 minutes.",
  },
});
