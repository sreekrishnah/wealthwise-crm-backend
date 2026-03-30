

import { Router } from "express";
import { handleGetGoals, handleCreateGoal, handleUpdateGoal } from "../controllers/goal.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const goalRouter = Router();

goalRouter.use(authenticateToken);

goalRouter.get("/", handleGetGoals);
goalRouter.post("/", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleCreateGoal);
goalRouter.patch("/:id", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleUpdateGoal);

export { goalRouter };
