

import { Router } from "express";
import { handleChatMessage, handleGetSessions, handleGetUsage, handleFeedback } from "../controllers/chat.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { chatRateLimiter } from "../middleware/rate-limiter.middleware.js";

const chatRouter = Router();

chatRouter.use(authenticateToken);

chatRouter.post("/message", chatRateLimiter, handleChatMessage);
chatRouter.get("/sessions", handleGetSessions);
chatRouter.get("/usage", handleGetUsage);
chatRouter.post("/feedback", handleFeedback);

export { chatRouter };
