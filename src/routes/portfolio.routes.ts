

import { Router } from "express";
import { handleGetHoldings, handleGetSummary } from "../controllers/portfolio.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const portfolioRouter = Router();

portfolioRouter.use(authenticateToken);

portfolioRouter.get("/holdings", handleGetHoldings);
portfolioRouter.get("/summary", handleGetSummary);

export { portfolioRouter };
