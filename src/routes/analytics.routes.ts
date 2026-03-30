

import { Router } from "express";
import { handleGetRmPerformance, handleGetProductAllocation, handleGetFlowData } from "../controllers/analytics.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const analyticsRouter = Router();

analyticsRouter.use(authenticateToken);
analyticsRouter.use(authorizeRoles(UserRole.ADMIN, UserRole.RM));

analyticsRouter.get("/rm-performance", handleGetRmPerformance);
analyticsRouter.get("/product-allocation", handleGetProductAllocation);
analyticsRouter.get("/flow", handleGetFlowData);

export { analyticsRouter };
