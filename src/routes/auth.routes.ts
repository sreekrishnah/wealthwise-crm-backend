

import { Router } from "express";
import { handleLogin, handleRegister, handleGetProfile } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rate-limiter.middleware.js";

const authRouter = Router();

authRouter.post("/login", authRateLimiter, handleLogin);
authRouter.post("/register", authRateLimiter, handleRegister);
authRouter.get("/profile", authenticateToken, handleGetProfile);

export { authRouter };
